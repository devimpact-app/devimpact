import { db } from '@/lib/db/client';
import { calendarSelections, calendarSyncRuns } from '@/lib/db/schema/gcal';
import { listEventsWindow } from '@/lib/integrations/gcal/api';
import { upsertCalendarEvents } from '@/lib/integrations/gcal/storage/store-events';
import { getIntegrationTokenId } from '@/lib/integrations/gcal/sync/sync-status';
import { minutesBetween } from '@/lib/utils/date';
import { addDays, subHours } from 'date-fns';
import { and, desc, eq } from 'drizzle-orm';

const DASHBOARD_REFRESH_INTERVAL_MIN = 10;
const OVERLAP_PAST_HOURS = 12;

export async function maybeRefreshUpcomingEvents(params: {
  tenantId: string;
  now: Date;
  lookaheadDays: number;
}) {
  const { tenantId, now, lookaheadDays } = params;

  const tokenId = await getIntegrationTokenId(tenantId);
  if (!tokenId)
    return { didRefresh: false as const, reason: 'no_token' as const };

  const [lastRun] = await db
    .select({
      completedAt: calendarSyncRuns.completedAt,
      windowEndAt: calendarSyncRuns.windowEndAt,
    })
    .from(calendarSyncRuns)
    .where(
      and(
        eq(calendarSyncRuns.tenantId, tenantId),
        eq(calendarSyncRuns.integrationTokenId, tokenId),
        eq(calendarSyncRuns.status, 'completed')
      )
    )
    .orderBy(desc(calendarSyncRuns.completedAt))
    .limit(1);

  // If we synced recently, don’t do extra work on dashboard load.
  if (lastRun?.completedAt) {
    const mins = minutesBetween(lastRun.completedAt, now);
    if (mins && mins < DASHBOARD_REFRESH_INTERVAL_MIN) {
      return { didRefresh: false as const, reason: 'fresh' as const };
    }
  }

  const selected = await db
    .select({
      calendarId: calendarSelections.calendarId,
    })
    .from(calendarSelections)
    .where(
      and(
        eq(calendarSelections.tenantId, tenantId),
        eq(calendarSelections.integrationTokenId, tokenId),
        eq(calendarSelections.isSelected, true)
      )
    )
    .limit(10);

  if (selected.length === 0) {
    return {
      didRefresh: false as const,
      reason: 'no_calendars_selected' as const,
    };
  }

  const windowStartAt = subHours(now, OVERLAP_PAST_HOURS);
  const windowEndAt = addDays(now, lookaheadDays);

  const [run] = await db
    .insert(calendarSyncRuns)
    .values({
      tenantId,
      integrationTokenId: tokenId,
      status: 'running',
      mode: 'dashboard_refresh',
      lookbackDays: null,
      windowStartAt,
      windowEndAt,
      startedAt: now,
      calendarsSyncedCount: 0,
      eventsUpsertedCount: 0,
    })
    .returning({ id: calendarSyncRuns.id });

  let calendarsSyncedCount = 0;
  let eventsUpsertedCount = 0;

  try {
    for (const cal of selected) {
      const resp = await listEventsWindow(tenantId, cal.calendarId, {
        timeMinISO: windowStartAt.toISOString(),
        timeMaxISO: windowEndAt.toISOString(),
        pageSize: 250,
      });
      if (!resp) continue;

      calendarsSyncedCount += 1;

      await upsertCalendarEvents({
        tenantId,
        integrationTokenId: tokenId,
        calendarId: cal.calendarId,
        events: resp.items,
        lastSyncedAt: new Date(),
      });

      eventsUpsertedCount += resp.items.length;
    }

    await db
      .update(calendarSyncRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        calendarsSyncedCount,
        eventsUpsertedCount,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncRuns.id, run.id));

    return { didRefresh: true as const, reason: 'ran' as const };
  } catch (err: any) {
    await db
      .update(calendarSyncRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorCode: err?.code ? String(err.code).slice(0, 64) : 'sync_failed',
        errorMessage: (err?.message ?? String(err)).slice(0, 500),
        calendarsSyncedCount,
        eventsUpsertedCount,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncRuns.id, run.id));

    return { didRefresh: false as const, reason: 'failed' as const };
  }
}
