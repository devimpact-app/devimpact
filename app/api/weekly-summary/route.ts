import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '@/app/api/_lib/http';

import { GetWeeklySummariesResponseSchema } from '@/types/api/weekly-summary';
import { serializeWeeklySummaryRow } from '@/lib/analysis/weekly-summary/api/serializers';
import {
  decodeWeeklySummaryCursor,
  encodeWeeklySummaryCursor,
} from '@/lib/analysis/weekly-summary/db/read/cursor';
import { listWeeklySummariesPage } from '@/lib/analysis/weekly-summary/db/read/listWeeklySummaries';

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

  const items = rows.map(serializeWeeklySummaryRow);

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
