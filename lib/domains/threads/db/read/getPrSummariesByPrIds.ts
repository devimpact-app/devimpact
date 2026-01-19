import { db } from '@/lib/db/client';
import { prSummaries, PrSummary } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export async function getPrSummariesByPrIds(
  tenantId: string,
  prIds: string[]
): Promise<
  Record<
    string,
    Pick<
      PrSummary,
      | 'prId'
      | 'repoFullName'
      | 'prNumber'
      | 'shortSummary'
      | 'highlights'
      | 'typeTags'
      | 'domainTags'
    >
  >
> {
  if (!prIds.length) return {};

  const CHUNK = 500;
  const out: Record<
    string,
    Pick<
      PrSummary,
      | 'prId'
      | 'repoFullName'
      | 'prNumber'
      | 'shortSummary'
      | 'highlights'
      | 'typeTags'
      | 'domainTags'
    >
  > = {};

  for (let i = 0; i < prIds.length; i += CHUNK) {
    const chunk = prIds.slice(i, i + CHUNK);

    const rows = await db
      .select({
        prId: prSummaries.prId,
        repoFullName: prSummaries.repoFullName,
        prNumber: prSummaries.prNumber,
        shortSummary: prSummaries.shortSummary,
        highlights: prSummaries.highlights,
        typeTags: prSummaries.typeTags,
        domainTags: prSummaries.domainTags,
      })
      .from(prSummaries)
      .where(
        and(
          eq(prSummaries.tenantId, tenantId),
          inArray(prSummaries.prId, chunk)
        )
      );

    for (const r of rows) {
      out[r.prId] = r;
    }
  }

  return out;
}
