import { db } from '@/lib/db/client';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { PrepGenerateRequest, PrepMeetingType } from '@/types/api/prep';
import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { derivePrepWindows } from './windows';
import { prepItems } from '@/lib/db/schema';

export function inferMeetingTypeFromCalendarCategory(params: {
  category?: string | null;
  categorySubtype?: string | null;
}): PrepMeetingType {
  const cat = params.category ?? 'other';
  const sub = params.categorySubtype ?? null;

  if (cat === 'oneOnOne') return 'oneOnOne';

  if (cat === 'team') {
    if (sub === 'standup') return 'standup';
    if (sub === 'planning') return 'planning';
    if (sub === 'retro') return 'retro';
    return 'planning';
  }

  return 'planning';
}

function computeEndAt(params: {
  startAt: Date;
  endAtISO?: string | null;
  durationMinutes?: number | null;
}) {
  if (params.endAtISO) return new Date(params.endAtISO);
  if (params.durationMinutes) {
    return new Date(params.startAt.getTime() + params.durationMinutes * 60_000);
  }
  return null;
}

export async function createPendingPrepItem(params: {
  tenantId: string;
  input: PrepGenerateRequest;
}) {
  const { tenantId, input } = params;

  if (input.prepItemId) {
    throw new Error('Already a prep item, use re-generate api');
  }

  if (input.source === 'calendar') {
    const [ev] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, input.calendarEventId),
          eq(calendarEvents.tenantId, tenantId)
        )
      );

    if (!ev || ev.deletedAt) throw new Error('Calendar event not found.');
    if (ev.status === 'cancelled')
      throw new Error('Cannot generate prep for cancelled event.');
    if (ev.selfResponseStatus === 'declined')
      throw new Error('Cannot generate prep for declined event.');

    const meetingType = inferMeetingTypeFromCalendarCategory({
      category: ev.category,
      categorySubtype: ev.categorySubtype,
    });

    let prev: { startAt: Date; endAt: Date } | null = null;
    if (ev.recurringEventId) {
      const [prevEv] = await db
        .select({
          startAt: calendarEvents.startAt,
          endAt: calendarEvents.endAt,
        })
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.tenantId, tenantId),
            eq(calendarEvents.recurringEventId, ev.recurringEventId),
            isNull(calendarEvents.deletedAt),
            lt(calendarEvents.startAt, ev.startAt)
          )
        )
        .orderBy(desc(calendarEvents.startAt))
        .limit(1);

      if (prevEv) prev = { startAt: prevEv.startAt, endAt: prevEv.endAt };
    }

    const windows = derivePrepWindows({
      meetingStartAt: ev.startAt,
      meetingType,
      previousMeetingStartAt: prev?.startAt,
      previousMeetingEndAt: prev?.endAt,
    });

    const [created] = await db
      .insert(prepItems)
      .values({
        tenantId,
        source: 'calendar',
        calendarEventId: ev.id,
        calendarId: ev.calendarId,
        googleEventId: ev.googleEventId,
        recurringEventId: ev.recurringEventId ?? null,
        startAt: ev.startAt,
        endAt: ev.endAt,
        durationMinutes: ev.durationMinutes ?? null,
        isAllDay: !!ev.isAllDay,
        titleRedacted: ev.titleRedacted ?? null,
        timezone: input.timezone,
        primaryWindowStartAt: windows.primary.startAt,
        primaryWindowEndAt: windows.primary.endAt,
        primaryWindowSource: windows.primary.source,
        secondaryWindowStartAt: windows.secondary.startAt,
        secondaryWindowEndAt: windows.secondary.endAt,
        secondaryWindowSource: windows.secondary.source,
        category: ev.category ?? null,
        categorySubtype: ev.categorySubtype ?? null,
        categoryConfidence: ev.categoryConfidence ?? null,
        categorySource: ev.categorySource ?? null,
        meetingType,
        status: 'pending',
        content: {},
      })
      .returning({ id: prepItems.id });

    return { prepItemId: created.id, created: true };
  }

  // Manual case
  const startAt = new Date(input.startAtISO);
  const endAt = computeEndAt({
    startAt,
    endAtISO: input.endAtISO ?? null,
    durationMinutes: input.durationMinutes ?? null,
  });

  const windows = derivePrepWindows({
    meetingStartAt: startAt,
    meetingType: input.meetingType,
    previousMeetingStartAt: undefined,
    previousMeetingEndAt: undefined,
  });

  const [created] = await db
    .insert(prepItems)
    .values({
      tenantId,
      source: 'manual',
      manualKey: input.manualKey,
      startAt,
      endAt: endAt ?? null,
      timezone: input.timezone,
      primaryWindowStartAt: windows.primary.startAt,
      primaryWindowEndAt: windows.primary.endAt,
      primaryWindowSource: windows.primary.source,
      secondaryWindowStartAt: windows.secondary.startAt,
      secondaryWindowEndAt: windows.secondary.endAt,
      secondaryWindowSource: windows.secondary.source,
      durationMinutes:
        input.durationMinutes ??
        (endAt
          ? Math.round((endAt.getTime() - startAt.getTime()) / 60000)
          : null),
      isAllDay: false,
      titleRedacted: input.title ?? null,
      meetingType: input.meetingType,
      status: 'pending',
      content: {},
    })
    .returning({ id: prepItems.id });

  return { prepItemId: created.id, created: true };
}
