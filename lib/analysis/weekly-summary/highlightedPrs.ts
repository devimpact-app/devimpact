import { PullRequest } from '@/lib/db/schema';
import { PR_TYPE_LABELS } from '@/lib/integrations/openai/prompts/prSummary';
import { HighlightReason, ShippedItem } from '@/types/api/weekly-summary';

function computeImpactScore(pr: PullRequest): number {
  const sizeComponent = Math.log(1 + (pr.linesChanged ?? 0));
  const filesComponent = 0.5 * (pr.filesChanged ?? 0);
  const discussionComponent = 0.3 * (pr.reviewCommentsCount ?? 0);

  return sizeComponent + filesComponent + discussionComponent;
}

function computeFrictionScore(pr: PullRequest): number {
  const iterationsComponent = pr.reviewRounds ?? 0;
  const latencyDays = pr.timeToFirstReviewSeconds
    ? pr.timeToFirstReviewSeconds / (24 * 60 * 60)
    : 0;
  const latencyComponent = Math.min(latencyDays, 3);
  const changesRequestedComponent = 0.5 * (pr.changesRequestedCount ?? 0);

  return iterationsComponent + latencyComponent + changesRequestedComponent;
}

export function getShippedItemFromPr(
  pr: PullRequest,
  highlightReason: HighlightReason,
  prSummariesById: Map<string, any>
): ShippedItem {
  const summary = prSummariesById.get(pr.id);
  return {
    prId: pr.id,
    repo: pr.repoFullName,
    number: pr.prNumber,
    title: pr.title,
    shortSummary: summary.shortSummary,
    tags: (summary.typeTags ?? []).map((rawTag: any) => PR_TYPE_LABELS[rawTag]),
    occurredAt: pr.mergedAt ? pr.mergedAt.toISOString() : undefined,
    htmlUrl: pr.htmlUrl ?? undefined,
    leadTimeHours: pr.leadTimeSeconds,
    timeToFirstReviewHours: pr.timeToFirstReviewSeconds,
    timeReviewToMergeHours: pr.reviewToMergeSeconds,
    linesChanged: pr.linesChanged,
    filesChanged: pr.filesChanged,
    reviewRounds: pr.reviewRounds,
    approvalsCount: pr.approvalsCount,
    touchedTests: pr.touchedTests,
    highlightReason,
  } as ShippedItem;
}

export function pickHighlightedAuthoredPrs(
  candidates: PullRequest[],
  prSummariesById: Map<string, any>
): ShippedItem[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= 2) {
    return [...candidates]
      .sort((a, b) => {
        const aTime = a.mergedAt!.getTime();
        const bTime = b.mergedAt!.getTime();
        return bTime - aTime;
      })
      .map((pr) => getShippedItemFromPr(pr, 'other', prSummariesById));
  }

  const scored = candidates.map((pr) => {
    const impactScore = computeImpactScore(pr);
    const frictionScore = computeFrictionScore(pr);
    const combinedScore = impactScore + 0.7 * frictionScore;

    return { pr, impactScore, frictionScore, combinedScore };
  });

  // Top impact PR
  const byImpact = [...scored].sort((a, b) => b.impactScore - a.impactScore);
  const topImpact = byImpact[0];

  // Top friction PR (different from top impact if possible)
  const byFriction = [...scored].sort(
    (a, b) => b.frictionScore - a.frictionScore
  );
  const topFriction = byFriction.find((item) => item.pr.id !== topImpact.pr.id);

  // Optional third: next best by combined score
  const usedIds = new Set<string>([topImpact.pr.id, topFriction?.pr.id ?? '']);

  const remaining = scored
    .filter((item) => !usedIds.has(item.pr.id))
    .sort((a, b) => b.combinedScore - a.combinedScore);
  const third = remaining[0];

  const highlighted: ShippedItem[] = [];
  if (topImpact)
    highlighted.push(
      getShippedItemFromPr(topImpact.pr, 'impact', prSummariesById)
    );
  if (topFriction)
    highlighted.push(
      getShippedItemFromPr(topFriction.pr, 'friction', prSummariesById)
    );
  if (third)
    highlighted.push(getShippedItemFromPr(third.pr, 'other', prSummariesById));

  return Array.from(
    new Map(highlighted.map((h) => [h.prId, h])).values()
  ).slice(0, 3);
}
