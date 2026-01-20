import { PrSummary, PullRequest } from '@/lib/db/schema';
import { getPrSummariesByPrIds } from '../../threads/db/read/getPrSummariesByPrIds';
import { getAuthoredPrs } from '../../timeline/db/getAuthoredPrs';
import { getAuthoredReviews } from '../../timeline/db/getAuthoredReviews';

type PRItem = {
  prId: string;
  mode: 'authored' | 'reviewed';
  sortAt?: Date;
  prUpdatedAt?: Date | null;
};

export async function getPrsToSummarize({
  tenantId,
  start,
  end,
  limit,
}: {
  tenantId: string;
  start: Date;
  end: Date;
  limit?: number;
}) {
  const authoredPrs = await getAuthoredPrs({
    tenantId,
    start,
    end,
  });
  const mergedAuthored = authoredPrs.filter((pr) => !!pr.mergedAt);
  const authoredSet = new Set(mergedAuthored.map((pr) => pr.id));
  const authoredReviews = await getAuthoredReviews(
    {
      tenantId,
      start,
      end,
    },
    {
      joinWithPrs: true,
    }
  );
  const reviewedMap = new Map<string, PullRequest>();
  for (const r of authoredReviews) {
    const pr = r.pr;
    if (!pr) continue;
    if (pr.authorIsTenant) continue;
    if (authoredSet.has(pr.id)) continue;
    if (!reviewedMap.has(pr.id)) reviewedMap.set(pr.id, pr);
  }
  const reviewedPrs = Array.from(reviewedMap.values());

  const candidates: PRItem[] = [
    ...mergedAuthored.map((pr) => ({
      prId: pr.id,
      mode: 'authored' as const,
      prUpdatedAt: pr.sourceUpdatedAt ?? null,
      sortAt: pr.mergedAt ?? pr.closedAt ?? pr.createdAt ?? null,
    })),
    ...reviewedPrs.map((pr) => ({
      prId: pr.id,
      mode: 'reviewed' as const,
      prUpdatedAt: pr.sourceUpdatedAt ?? null,
      sortAt: (pr.mergedAt ?? pr.closedAt ?? pr.createdAt ?? null) as any,
    })),
  ];

  if (candidates.length === 0) return [];

  const ordered = candidates.slice().sort((a, b) => {
    const at = a.sortAt ? a.sortAt.getTime() : 0;
    const bt = b.sortAt ? b.sortAt.getTime() : 0;
    return bt - at;
  });

  const prIds = ordered.map((i) => i.prId);
  const summariesByPrId = (await getPrSummariesByPrIds(
    tenantId,
    prIds
  )) as Record<string, PrSummary | undefined>;

  const needs: PRItem[] = [];
  for (const item of ordered) {
    const summary = summariesByPrId[item.prId];
    const summaryPrUpdatedAt = summary?.prUpdatedAt
      ? new Date(summary.prUpdatedAt)
      : null;
    const prUpdatedAt = item.prUpdatedAt ? new Date(item.prUpdatedAt) : null;

    const missing = !summary;
    const stale =
      !!summary &&
      !!prUpdatedAt &&
      (!summaryPrUpdatedAt ||
        summaryPrUpdatedAt.getTime() < prUpdatedAt.getTime());

    if (missing || stale) {
      needs.push(item);
      if (typeof limit === 'number' && needs.length >= limit) break;
    }
  }

  return needs.map(({ prId, mode }) => ({ prId, mode }));
}
