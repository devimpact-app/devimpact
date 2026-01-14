import { db } from '@/lib/db/client';
import { weeklySummaries } from '@/lib/db/schema/weekly-summary';
import { and, eq } from 'drizzle-orm';

export async function getWeeklySummaryById({
  tenantId,
  summaryId,
}: {
  tenantId: string;
  summaryId: string;
}) {
  const row = await db
    .select()
    .from(weeklySummaries)
    .where(
      and(
        eq(weeklySummaries.tenantId, tenantId),
        eq(weeklySummaries.id, summaryId)
      )
    )
    .limit(1);

  return row.length > 0 ? row[0] : null;
}
