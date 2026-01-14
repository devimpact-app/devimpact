import { PullRequest } from '@/lib/db/schema';
import { ShippedItem } from '@/types/api/weekly-activity';
import { serializeShippedItem } from '../api/serializers';

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
      .map((pr) => serializeShippedItem(pr, 'other', prSummariesById));
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
      serializeShippedItem(topImpact.pr, 'impact', prSummariesById)
    );
  if (topFriction)
    highlighted.push(
      serializeShippedItem(topFriction.pr, 'friction', prSummariesById)
    );
  if (third)
    highlighted.push(serializeShippedItem(third.pr, 'other', prSummariesById));

  return Array.from(
    new Map(highlighted.map((h) => [h.prId, h])).values()
  ).slice(0, 3);
}
