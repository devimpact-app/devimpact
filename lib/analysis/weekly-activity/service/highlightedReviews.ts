import { PullRequest, Review } from '@/lib/db/schema';
import { serializeHighlightedReview } from '../api/serializers';

export function scoreReview(r: Review): number {
  let score = 0;

  score += Math.min(r.reviewCommentsCount ?? 0, 10) * 1.2;

  if (r.state === 'changes_requested') score += 6;

  if (r.wasFirstReview) score += 4;

  // Approved with zero comments = low-value, score stays low

  return score;
}

export function isReviewWorthConsidering(r: Review): boolean {
  return (r.reviewCommentsCount ?? 0) > 0 || r.state === 'changes_requested';
}

export function pickHighlightedReview(
  reviews: {
    review: Review;
    pr: PullRequest;
  }[]
) {
  const candidates = reviews.filter((r) => isReviewWorthConsidering(r.review));

  if (candidates.length === 0) return undefined;

  const scored = candidates
    .map((r) => ({ review: r, score: scoreReview(r.review) }))
    .sort((a, b) => b.score - a.score);

  return serializeHighlightedReview(scored[0].review);
}
