import { and, asc, desc, eq, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { WeeklySummaryCursor } from './cursor';
import { weeklySummaries } from '@/lib/db/schema/weekly-summary';

export async function listWeeklySummariesPage(params: {
  tenantId: string;
  limit: number;
  cursor?: WeeklySummaryCursor | null;
  oldestFirst?: boolean;
}) {
  const { tenantId, limit, cursor } = params;

  let where = eq(weeklySummaries.tenantId, tenantId);

  if (cursor) {
    const sortAt = new Date(cursor.sortAtIso);
    where = and(
      where,
      or(
        lt(weeklySummaries.rangeStartUtc, sortAt),
        and(
          eq(weeklySummaries.rangeStartUtc, sortAt),
          lt(weeklySummaries.id, cursor.id)
        )
      )
    ) as any;
  }

  const rows = await db
    .select()
    .from(weeklySummaries)
    .where(where)
    .orderBy(
      params.oldestFirst
        ? asc(weeklySummaries.rangeStartUtc)
        : desc(weeklySummaries.rangeStartUtc),
      desc(weeklySummaries.id)
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && page.length
      ? {
          sortAtIso: page[page.length - 1].rangeStartUtc.toISOString(),
          id: page[page.length - 1].id,
        }
      : null;

  const totalRow = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(weeklySummaries)
    .where(where)
    .limit(1);

  const total = Number(totalRow[0]?.total ?? 0);

  return { rows: page, nextCursor, total };
}
