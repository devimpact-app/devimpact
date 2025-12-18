import { db } from '@/lib/db/client';
import { calendarSelections, calendarSyncRuns } from '@/lib/db/schema/gcal';
import { and, desc, eq } from 'drizzle-orm';
import { getIntegrationTokenId } from './sync-status';
import { daysAgo, hoursSince } from '@/lib/utils/date';
import { listEventsWindow } from '../api';
import { upsertCalendarEvents } from '../storage/store-events';
import { addDays, subHours } from 'date-fns';
import { GoogleEventsListItem } from '../types';

const LOOKBACK_DAYS_INITIAL = 90;
const FUTURE_LOOKAHEAD_DAYS = 14;

// For incremental-ish runs (no syncToken), we still overlap a bit
const OVERLAP_PAST_HOURS = 12;

// Safety net if sync hasn’t run in a while
const STALE_SYNC_THRESHOLD_HOURS = 48;
const STALE_LOOKBACK_DAYS = 14;

export type SyncResponse = {
  error?: {
    code: 'bad_request' | 'internal';
    message: string;
  };
  run?: {
    runId: string;
    status: string;
    lookbackDays: number | null;
    timeMinISO: string;
    timeMaxISO: string;
    calendarsSelectedCount: number;
    calendarsSyncedCount: number;
    eventsUpsertedCount: number;
    truncatedCalendars: number;
  };
};

export async function checkCurrentlyRunningSync(
  userId: string,
  tokenId: string
): Promise<boolean> {
  const [running] = await db
    .select({ id: calendarSyncRuns.id })
    .from(calendarSyncRuns)
    .where(
      and(
        eq(calendarSyncRuns.tenantId, userId),
        eq(calendarSyncRuns.integrationTokenId, tokenId),
        eq(calendarSyncRuns.status, 'running')
      )
    )
    .limit(1);
  return !!running;
}

export async function getSelectedCalendars(userId: string, tokenId: string) {
  const selected = await db
    .select({
      id: calendarSelections.id,
      calendarId: calendarSelections.calendarId,
      summary: calendarSelections.summary,
      lastSyncedAt: calendarSelections.lastSyncedAt,
    })
    .from(calendarSelections)
    .where(
      and(
        eq(calendarSelections.tenantId, userId),
        eq(calendarSelections.integrationTokenId, tokenId),
        eq(calendarSelections.isSelected, true)
      )
    )
    .limit(50);
  return selected;
}

export async function runSync(userId: string): Promise<SyncResponse> {
  const tokenId = await getIntegrationTokenId(userId);
  if (!tokenId) {
    return {
      error: {
        code: 'bad_request',
        message: 'Google Calendar is not connected.',
      },
    };
  }

  const isRunning = await checkCurrentlyRunningSync(userId, tokenId);
  if (isRunning)
    return {
      error: {
        code: 'bad_request',
        message: 'Google Calendar sync already running',
      },
    };

  const selected = await getSelectedCalendars(userId, tokenId);
  if (selected.length === 0) {
    return {
      error: {
        code: 'bad_request',
        message: 'No calendars selected. Select at least one calendar to sync.',
      },
    };
  }

  if (selected.length > 10) {
    return {
      error: {
        code: 'bad_request',
        message: 'Only up to 10 calendars supported at the moment',
      },
    };
  }

  const now = new Date();
  const windowEndAt = addDays(now, FUTURE_LOOKAHEAD_DAYS);

  const [lastRun] = await db
    .select({
      windowEndAt: calendarSyncRuns.windowEndAt,
      completedAt: calendarSyncRuns.completedAt,
    })
    .from(calendarSyncRuns)
    .where(
      and(
        eq(calendarSyncRuns.tenantId, userId),
        eq(calendarSyncRuns.integrationTokenId, tokenId),
        eq(calendarSyncRuns.status, 'completed')
      )
    )
    .orderBy(desc(calendarSyncRuns.completedAt))
    .limit(1);

  const isFirstSync = !lastRun?.completedAt;
  let windowStartAt: Date;

  if (isFirstSync) {
    windowStartAt = daysAgo(now, LOOKBACK_DAYS_INITIAL);
  } else {
    const hoursSinceLast = hoursSince(
      lastRun.completedAt ?? lastRun.windowEndAt ?? now,
      now
    );

    if (hoursSinceLast >= STALE_SYNC_THRESHOLD_HOURS) {
      windowStartAt = daysAgo(now, STALE_LOOKBACK_DAYS);
    } else {
      const cursor = lastRun.windowEndAt ?? now;
      windowStartAt = subHours(cursor, OVERLAP_PAST_HOURS);
    }
  }

  const timeMinISO = windowStartAt.toISOString();
  const timeMaxISO = windowEndAt.toISOString();

  const [run] = await db
    .insert(calendarSyncRuns)
    .values({
      tenantId: userId,
      integrationTokenId: tokenId,
      status: 'running',
      mode: isFirstSync ? 'initial' : 'manual',
      lookbackDays: isFirstSync ? LOOKBACK_DAYS_INITIAL : null,
      windowStartAt,
      windowEndAt,
      startedAt: now,
      calendarsSyncedCount: 0,
      eventsUpsertedCount: 0,
    })
    .returning({ id: calendarSyncRuns.id });

  let calendarsSyncedCount = 0;
  let eventsUpsertedCount = 0;
  let truncatedCalendars: string[] = [];

  try {
    for (const cal of selected) {
      const resp = await listEventsWindow(userId, cal.calendarId, {
        timeMinISO,
        timeMaxISO,
        pageSize: 250,
      });

      if (!resp) continue;

      calendarsSyncedCount += 1;

      await upsertCalendarEvents({
        tenantId: userId,
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

    return {
      run: {
        runId: run.id,
        status: 'completed',
        lookbackDays: isFirstSync ? LOOKBACK_DAYS_INITIAL : null,
        timeMinISO,
        timeMaxISO,
        calendarsSelectedCount: selected.length,
        calendarsSyncedCount,
        eventsUpsertedCount,
        truncatedCalendars: truncatedCalendars.length,
      },
    };
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

    return {
      error: {
        code: 'internal',
        message: 'Calendar sync failed',
      },
    };
  }
}
