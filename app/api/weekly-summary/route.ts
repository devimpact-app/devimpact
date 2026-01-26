import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '@/app/api/_lib/http';

import { GetWeeklySummariesResponseSchema } from '@/types/api/weekly-summary';
import { serializeWeeklySummaryRow } from '@/lib/domains/weekly-summary/api/serializers';
import {
  decodeWeeklySummaryCursor,
  encodeWeeklySummaryCursor,
} from '@/lib/domains/weekly-summary/db/read/cursor';
import { listWeeklySummariesPage } from '@/lib/domains/weekly-summary/db/read/listWeeklySummaries';
import { buildWeeklyActivity } from '@/lib/domains/weekly-activity/service/buildWeeklyActivity';
import { WeeklyActivity } from '@/types/api/weekly-activity';

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const tenantId = session.user.id;

  const url = new URL(req.url);
  const sp = url.searchParams;

  const limitParam = sp.get('limit');
  const cursor = sp.get('cursor');
  const oldestFirstParam = sp.get('oldestFirst');
  const oldestFirst = !!oldestFirstParam && oldestFirstParam === 'true';

  const limitRaw = limitParam ? Number(limitParam) : 20;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : 20;
  const expandActivity = limit === 1;

  const decoded = cursor ? decodeWeeklySummaryCursor(cursor) : null;
  if (cursor && !decoded) return jsonBadRequest('Invalid cursor');

  const { rows, nextCursor, total } = await listWeeklySummariesPage({
    tenantId,
    limit,
    oldestFirst,
    cursor: decoded
      ? {
          sortAtIso: decoded.sortAt.toISOString(),
          id: decoded.id,
        }
      : undefined,
  });

  let activity: WeeklyActivity | undefined = undefined;
  if (expandActivity && rows.length === 1) {
    activity = await buildWeeklyActivity({
      userId: tenantId,
      rangeStart: new Date(rows[0].rangeStartUtc),
      rangeEnd: new Date(rows[0].rangeEndUtc),
      timezone: rows[0].timezone,
    });
  }

  const items = rows.map((r) => {
    const serialized = serializeWeeklySummaryRow(r);
    if (activity) {
      serialized.activity = activity;
    }
    return serialized;
  });

  const parsed = GetWeeklySummariesResponseSchema.safeParse({
    items,
    totalSummaries: Number(total),
    nextCursor: nextCursor
      ? encodeWeeklySummaryCursor(nextCursor.sortAtIso, nextCursor.id)
      : null,
  });

  if (!parsed.success) {
    return jsonBadRequest('Failed to parse weekly summaries response');
  }

  return jsonOK(parsed.data);
});
