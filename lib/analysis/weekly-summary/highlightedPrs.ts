import { PullRequest } from '@/lib/db/schema';

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
  candidates: PullRequest[]
): PullRequest[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= 2) {
    return [...candidates].sort((a, b) => {
      const aTime = a.mergedAt!.getTime();
      const bTime = b.mergedAt!.getTime();
      return bTime - aTime;
    });
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

  const highlighted: PullRequest[] = [];
  if (topImpact) highlighted.push(topImpact.pr);
  if (topFriction) highlighted.push(topFriction.pr);
  if (third) highlighted.push(third.pr);

  return Array.from(
    new Map(highlighted.map((pr) => [pr.id, pr])).values()
  ).slice(0, 3);
}
