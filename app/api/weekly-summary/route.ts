import { NextRequest } from 'next/server';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '@/app/api/_lib/http';

import { GetWeeklySummariesResponseSchema } from '@/types/api/weekly-summary'; // TODO: adjust path
import { weeklySummaries } from '@/lib/db/schema/weekly-summary';
import { serializeWeeklySummaryRow } from '@/lib/analysis/weekly-summary/serialize';

function encodeCursor(sortAtIso: string, id: string) {
  return `${sortAtIso}__${id}`;
}

function decodeCursor(cursor: string): { sortAt: Date; id: string } | null {
  const parts = cursor.split('__');
  if (parts.length !== 2) return null;
  const [iso, id] = parts;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { sortAt: d, id };
}

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const tenantId = session.user.id;

  const url = new URL(req.url);
  const sp = url.searchParams;

  const limitParam = sp.get('limit');
  const cursor = sp.get('cursor');

  const limitRaw = limitParam ? Number(limitParam) : 20;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : 20;

  let where = eq(weeklySummaries.tenantId, tenantId);
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) return jsonBadRequest('Invalid cursor');
    where = and(
      where,
      or(
        lt(weeklySummaries.rangeStartUtc, decoded.sortAt),
        and(
          eq(weeklySummaries.rangeStartUtc, decoded.sortAt),
          lt(weeklySummaries.id, decoded.id)
        )
      )
    ) as any;
  }

  const rows = await db
    .select()
    .from(weeklySummaries)
    .where(where)
    .orderBy(desc(weeklySummaries.rangeStartUtc), desc(weeklySummaries.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = pageRows.map(serializeWeeklySummaryRow);

  const nextCursor =
    hasMore && pageRows[pageRows.length - 1]
      ? encodeCursor(
          pageRows[pageRows.length - 1].rangeStartUtc.toISOString(),
          pageRows[pageRows.length - 1].id
        )
      : null;

  const parsed = GetWeeklySummariesResponseSchema.safeParse({
    items,
    nextCursor,
  });

  if (!parsed.success) {
    return jsonBadRequest('Failed to parse weekly summaries response');
  }

  return jsonOK(parsed.data);
});
