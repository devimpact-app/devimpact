import { and, desc, eq, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { WeeklySummaryCursor } from './cursor';
import { weeklySummaries } from '@/lib/db/schema/weekly-summary';

export async function listWeeklySummariesPage(params: {
  tenantId: string;
  limit: number;
  cursor?: WeeklySummaryCursor | null;
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
    .orderBy(desc(weeklySummaries.rangeStartUtc), desc(weeklySummaries.id))
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

  return { rows: page, nextCursor };
}
