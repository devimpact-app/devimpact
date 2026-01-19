import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../_lib/http';
import { GetWeeklySummaryDetailResponseSchema } from '@/types/api/weekly-summary';
import { serializeWeeklySummaryRow } from '@/lib/domains/weekly-summary/api/serializers';
import { getWeeklySummaryById } from '@/lib/domains/weekly-summary/db/read/getWeeklySummaryById';
import { listThreadsDb } from '@/lib/domains/threads/db/read/listThreads';
import { ActivityEventListItem, ThreadListItem } from '@/types/api/threads';
import {
  serializeActivityEventListItem,
  serializeThreadListItem,
} from '@/lib/domains/threads/api/serializers';
import { listEventsById } from '@/lib/domains/threads/db/read/listEventsById';
import { buildWeeklyActivity } from '@/lib/domains/weekly-activity/service/buildWeeklyActivity';

export const GET = withSentryUser(
  async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
    const tenantId = session.user.id;

    const { id } = await context.params;
    const summary = await getWeeklySummaryById({ tenantId, summaryId: id });

    if (!summary) return jsonNotFound('Weekly summary not found');

    let threads: ThreadListItem[] = [];
    if (summary.referencedThreadIds.length > 0) {
      const { rows: threadRows, lastEventsByThreadId } = await listThreadsDb({
        tenantId,
        status: 'active',
        limit: summary.referencedThreadIds.length,
        threadIds: summary.referencedThreadIds,
      });
      threads = threadRows.map((r) => {
        const le = lastEventsByThreadId[r.id] ?? null;
        return serializeThreadListItem({ row: r, lastEvent: le });
      });
    }

    let events: ActivityEventListItem[] = [];
    if (summary.referencedEventIds.length > 0) {
      const { rows: eventRows } = await listEventsById({
        tenantId,
        eventIds: summary.referencedEventIds,
        limit: summary.referencedEventIds.length,
      });
      events = eventRows.map((r) => serializeActivityEventListItem(r));
    }

    const activity = await buildWeeklyActivity({
      userId: tenantId,
      rangeStart: new Date(summary.rangeStartUtc),
      rangeEnd: new Date(summary.rangeEndUtc),
      timezone: summary.timezone,
    });

    const out = {
      summary: {
        ...serializeWeeklySummaryRow(summary),
        activity,
      },
      threads,
      events,
    };

    const parsed = GetWeeklySummaryDetailResponseSchema.safeParse(out);
    if (!parsed.success) {
      return jsonBadRequest('Failed to parse weekly summary detail response');
    }

    return jsonOK(parsed.data);
  }
);
