import { db } from '@/lib/db/client';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { activityEvents } from '@/lib/db/schema/activity';
import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';

type DeriveFromCalendarEventIdsArgs = {
  tenantId: string;
  now?: Date;
  pastOnly?: boolean;
  lookbackDays?: number;
};

type DeriveResult = {
  upserted: number;
  deleted: number;
  skipped: number;
};

function buildSubtitle(e: {
  durationMinutes: number | null;
  category: string | null;
  categorySubtype: string | null;
  isAllDay: boolean;
}) {
  const bits: string[] = [];

  const label = e.categorySubtype ?? e.category ?? null;
  if (label) bits.push(label);

  if (e.isAllDay) bits.push('All day');
  else if (e.durationMinutes) bits.push(`${e.durationMinutes}m`);

  return bits.length ? bits.join(' • ') : null;
}

/**
 * Derives `activity_events` rows from canonical `calendar_events` rows.
 * - idempotent upsert keyed by (tenantId, source, sourceEntityTable, sourceEntityId, eventType)
 * - v1 defaults to "past-only"
 * - deletes ledger rows for calendar events that are soft-deleted
 */
export async function deriveActivityEventsFromCalendarEvents(
  args: DeriveFromCalendarEventIdsArgs
): Promise<DeriveResult> {
  const { tenantId } = args;
  const now = args.now ?? new Date();
  const pastOnly = args.pastOnly ?? true;

  const lookbackDays = args.lookbackDays ?? 14;
  const cutoff = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: calendarEvents.id,
      status: calendarEvents.status,
      eventType: calendarEvents.eventType,
      startAt: calendarEvents.startAt,
      endAt: calendarEvents.endAt,
      durationMinutes: calendarEvents.durationMinutes,
      isAllDay: calendarEvents.isAllDay,
      title: calendarEvents.title,
      recurringEventId: calendarEvents.recurringEventId,
      selfResponseStatus: calendarEvents.selfResponseStatus,
      isOrganizerSelf: calendarEvents.isOrganizerSelf,
      category: calendarEvents.category,
      categorySubtype: calendarEvents.categorySubtype,
      categoryConfidence: calendarEvents.categoryConfidence,
      categorySource: calendarEvents.categorySource,
      deletedAt: calendarEvents.deletedAt,
      sourceUpdatedAt: calendarEvents.updatedAtGoogle,
      existingDerivedAt: activityEvents.derivedAt,
      existingEventId: activityEvents.id,
    })
    .from(calendarEvents)
    .leftJoin(
      activityEvents,
      and(
        eq(activityEvents.tenantId, calendarEvents.tenantId),
        eq(activityEvents.source, 'gcal'),
        eq(activityEvents.sourceEntityTable, 'calendar_events'),
        eq(activityEvents.sourceEntityId, calendarEvents.id)
      )
    )
    .where(
      and(
        eq(calendarEvents.tenantId, tenantId),
        or(
          gt(calendarEvents.endAt, cutoff),
          gt(calendarEvents.startAt, cutoff)
        ),
        or(
          isNull(activityEvents.id),
          gt(calendarEvents.updatedAtGoogle, activityEvents.derivedAt)
        )
      )
    );

  const deletedIds = rows.filter((r) => r.deletedAt).map((r) => r.id);
  let deleted = 0;
  if (deletedIds.length) {
    const res = await db
      .delete(activityEvents)
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          eq(activityEvents.source, 'gcal'),
          eq(activityEvents.sourceEntityTable, 'calendar_events'),
          inArray(activityEvents.sourceEntityId, deletedIds)
        )
      )
      .returning({ id: activityEvents.id });

    deleted = res.length;
  }

  const toUpsert: Array<typeof activityEvents.$inferInsert> = [];
  let skipped = 0;
  for (const e of rows) {
    if (e.status === 'cancelled') {
      skipped += 1;
      continue;
    }

    if (e.category === 'personal' || e.category === 'focus') {
      skipped += 1;
      continue;
    }

    if (e.deletedAt) {
      continue;
    }

    if (pastOnly && e.endAt > now) {
      skipped += 1;
      continue;
    }

    const isOOO = e.category === 'ooo';
    if (isOOO) {
      toUpsert.push({
        tenantId,
        source: 'gcal',
        eventType: 'ooo',
        occurredAt: e.startAt,
        endAt: e.endAt,
        title: e.title ?? 'Out of office',
        subtitle: buildSubtitle({
          durationMinutes: e.durationMinutes,
          category: e.category,
          categorySubtype: e.categorySubtype,
          isAllDay: e.isAllDay,
        }),
        url: null,
        sourceEntityTable: 'calendar_events',
        sourceEntityId: e.id,
        repoFullName: null,
        prNumber: null,
        recurringEventId: e.recurringEventId ?? null,
        metadata: {
          kind: 'ooo',
          isAllDay: e.isAllDay,
          durationMinutes: e.durationMinutes ?? undefined,
        },
        derivedVersion: 1,
        derivedAt: now,
      });
      continue;
    }

    const s = (e.selfResponseStatus ?? '').toLowerCase();
    const eventValid =
      s === 'accepted' || s === 'tentative' || s === 'needsAction';
    if (!eventValid) {
      skipped += 1;
      continue;
    }

    toUpsert.push({
      tenantId,
      source: 'gcal',
      eventType: 'meeting_attended',
      occurredAt: e.startAt,
      endAt: e.endAt,
      title: e.title ?? 'Meeting',
      subtitle: buildSubtitle({
        durationMinutes: e.durationMinutes,
        category: e.category,
        categorySubtype: e.categorySubtype,
        isAllDay: e.isAllDay,
      }),
      url: null,
      sourceEntityTable: 'calendar_events',
      sourceEntityId: e.id,
      repoFullName: null,
      prNumber: null,
      recurringEventId: e.recurringEventId ?? null,
      metadata: {
        kind: 'meeting',
        participation: {
          selfResponseStatus: (s as any) ?? 'needsAction',
          isOrganizerSelf: !!e.isOrganizerSelf,
        },
        structure: {
          isRecurring: !!e.recurringEventId,
          recurringEventId: e.recurringEventId ?? undefined,
          durationMinutes: e.durationMinutes ?? 0,
          isAllDay: !!e.isAllDay,
        },
        classification:
          e.category || e.categorySubtype
            ? {
                category: e.category ?? undefined,
                categorySubtype: e.categorySubtype ?? undefined,
                categoryConfidence: e.categoryConfidence ?? undefined,
                categorySource: (e.categorySource as any) ?? undefined,
              }
            : undefined,
      },
      derivedVersion: 1,
      derivedAt: now,
    });
  }

  if (!toUpsert.length) {
    return { upserted: 0, deleted, skipped };
  }

  const CHUNK = 500;
  let upserted = 0;

  for (let i = 0; i < toUpsert.length; i += CHUNK) {
    const chunk = toUpsert.slice(i, i + CHUNK);

    const ret = await db
      .insert(activityEvents)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          activityEvents.tenantId,
          activityEvents.source,
          activityEvents.sourceEntityTable,
          activityEvents.sourceEntityId,
          activityEvents.eventType,
        ],
        set: {
          occurredAt: sql`excluded.occurred_at`,
          endAt: sql`excluded.end_at`,
          title: sql`excluded.title`,
          subtitle: sql`excluded.subtitle`,
          url: sql`excluded.url`,
          recurringEventId: sql`excluded.recurring_event_id`,
          metadata: sql`excluded.metadata`,
          derivedVersion: sql`excluded.derived_version`,
          derivedAt: sql`excluded.derived_at`,
        },
      })
      .returning({ id: activityEvents.id });

    upserted += ret.length;
  }

  return { upserted, deleted, skipped };
}
