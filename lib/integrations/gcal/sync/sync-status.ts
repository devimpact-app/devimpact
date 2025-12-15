import { CalendarStatusResponse } from '@/types/api/calendar';
import { db } from '@/lib/db/client';
import { integrationTokens } from '@/lib/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { calendarSelections, calendarSyncRuns } from '@/lib/db/schema/gcal';

export async function getIntegrationTokenId(
  userId: string
): Promise<string | null> {
  const [token] = await db
    .select({ id: integrationTokens.id })
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, userId),
        eq(integrationTokens.provider, 'google_calendar'),
        eq(integrationTokens.tokenType, 'oauth')
      )
    )
    .limit(1);
  return token?.id || null;
}

export async function getSyncStatus(
  userId: string
): Promise<CalendarStatusResponse> {
  const tokenId = await getIntegrationTokenId(userId);

  if (!tokenId) {
    return {
      state: 'not_connected',
      connected: false,
      availableCalendarsCount: 0,
      selectedCalendarsCount: 0,
      lastSyncRun: null,
    };
  }

  const [counts] = await db
    .select({
      availableCalendarsCount: sql<number>`count(*)::int`,
      selectedCalendarsCount: sql<number>`sum(case when ${calendarSelections.isSelected} then 1 else 0 end)::int`,
    })
    .from(calendarSelections)
    .where(
      and(
        eq(calendarSelections.tenantId, userId),
        eq(calendarSelections.integrationTokenId, tokenId)
      )
    );

  const availableCalendarsCount = counts?.availableCalendarsCount ?? 0;
  const selectedCalendarsCount = counts?.selectedCalendarsCount ?? 0;

  const [lastRun] = await db
    .select({
      id: calendarSyncRuns.id,
      status: calendarSyncRuns.status,
      mode: calendarSyncRuns.mode,
      startedAt: calendarSyncRuns.startedAt,
      completedAt: calendarSyncRuns.completedAt,
      calendarsSyncedCount: calendarSyncRuns.calendarsSyncedCount,
      eventsUpsertedCount: calendarSyncRuns.eventsUpsertedCount,
      errorCode: calendarSyncRuns.errorCode,
    })
    .from(calendarSyncRuns)
    .where(
      and(
        eq(calendarSyncRuns.tenantId, userId),
        eq(calendarSyncRuns.integrationTokenId, tokenId)
      )
    )
    .orderBy(desc(calendarSyncRuns.startedAt))
    .limit(1);

  let state:
    | 'connected_no_calendars'
    | 'connected_no_selection'
    | 'ready_to_sync'
    | 'syncing'
    | 'synced'
    | 'error';

  if (availableCalendarsCount === 0) state = 'connected_no_calendars';
  else if (selectedCalendarsCount === 0) state = 'connected_no_selection';
  else if (lastRun?.status === 'pending' || lastRun?.status === 'running')
    state = 'syncing';
  else if (lastRun?.status === 'failed') state = 'error';
  else if (lastRun?.status === 'completed') state = 'synced';
  else state = 'ready_to_sync';

  return {
    state,
    connected: true,
    availableCalendarsCount,
    selectedCalendarsCount,
    lastSyncRun: lastRun
      ? {
          ...lastRun,
          startedAt: lastRun.startedAt.toISOString(),
          completedAt: lastRun.completedAt
            ? lastRun.completedAt.toISOString()
            : null,
          calendarsSyncedCount: lastRun.calendarsSyncedCount ?? 0,
          eventsUpsertedCount: lastRun.eventsUpsertedCount ?? 0,
        }
      : null,
  };
}
