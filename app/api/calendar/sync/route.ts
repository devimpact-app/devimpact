import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import {
  jsonOK,
  jsonUnauthorized,
  jsonBadRequest,
  jsonServerError,
} from '@/app/api/_lib/http';
import { and, desc, eq } from 'drizzle-orm';
import { integrationTokens } from '@/lib/db/schema';
import { calendarSelections, calendarSyncRuns } from '@/lib/db/schema/gcal';
import { listEvents } from '@/lib/integrations/gcal/api';
import { daysAgo } from '@/lib/utils/date';
import { upsertCalendarEvents } from '@/lib/integrations/gcal/storage/store-events';

const LOOKBACK_DAYS_DEFAULT = 90;

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
  const userId = session.user.id;

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

  if (!token) {
    return jsonBadRequest('Google Calendar is not connected.');
  }

  const [running] = await db
    .select({ id: calendarSyncRuns.id })
    .from(calendarSyncRuns)
    .where(
      and(
        eq(calendarSyncRuns.tenantId, userId),
        eq(calendarSyncRuns.integrationTokenId, token.id),
        eq(calendarSyncRuns.status, 'running')
      )
    )
    .limit(1);

  if (running) return jsonBadRequest('A calendar sync is already running.');

  const selected = await db
    .select({
      id: calendarSelections.id,
      calendarId: calendarSelections.calendarId,
      summary: calendarSelections.summary,
    })
    .from(calendarSelections)
    .where(
      and(
        eq(calendarSelections.tenantId, userId),
        eq(calendarSelections.integrationTokenId, token.id),
        eq(calendarSelections.isSelected, true)
      )
    )
    .limit(50);

  if (selected.length === 0) {
    return jsonBadRequest(
      'No calendars selected. Select at least one calendar to sync.'
    );
  }

  if (selected.length > 10) {
    return jsonBadRequest('Select up to 10 calendars for now.');
  }

  const [lastRun] = await db
    .select({
      windowEndAt: calendarSyncRuns.windowEndAt,
      completedAt: calendarSyncRuns.completedAt,
      mode: calendarSyncRuns.mode,
      lookbackDays: calendarSyncRuns.lookbackDays,
    })
    .from(calendarSyncRuns)
    .where(
      and(
        eq(calendarSyncRuns.tenantId, userId),
        eq(calendarSyncRuns.integrationTokenId, token.id),
        eq(calendarSyncRuns.status, 'completed')
      )
    )
    .orderBy(desc(calendarSyncRuns.completedAt))
    .limit(1);

  const isFirstSync = !lastRun;

  const now = new Date();
  const hardFloor = daysAgo(now, LOOKBACK_DAYS_DEFAULT);
  const OVERLAP_HOURS = 12;

  const cursor = lastRun?.windowEndAt ?? null;

  const windowStartAt = cursor
    ? new Date(
        Math.max(
          hardFloor.getTime(),
          cursor.getTime() - OVERLAP_HOURS * 60 * 60 * 1000
        )
      )
    : hardFloor;

  const windowEndAt = now;
  const timeMinISO = windowStartAt.toISOString();
  const timeMaxISO = windowEndAt.toISOString();

  const [run] = await db
    .insert(calendarSyncRuns)
    .values({
      tenantId: userId,
      integrationTokenId: token.id,
      status: 'running',
      mode: isFirstSync ? 'initial' : 'manual',
      lookbackDays: isFirstSync ? LOOKBACK_DAYS_DEFAULT : null,
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
      const resp = await listEvents(userId, cal.calendarId, {
        timeMinISO,
        timeMaxISO,
        pageSize: 250,
      });

      if (!resp) continue;

      calendarsSyncedCount += 1;

      await upsertCalendarEvents({
        tenantId: userId,
        integrationTokenId: token.id,
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

    return jsonOK({
      runId: run.id,
      status: 'completed',
      lookbackDays: LOOKBACK_DAYS_DEFAULT,
      timeMinISO,
      timeMaxISO,
      calendarsSelectedCount: selected.length,
      calendarsSyncedCount,
      eventsUpsertedCount,
      truncatedCalendars,
    });
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

    return jsonServerError('Calendar sync failed.');
  }
}
