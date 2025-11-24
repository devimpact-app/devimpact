import { PullRequest, Review } from '@/lib/db/schema';

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
    pr?: PullRequest | null;
  }[]
) {
  const candidates = reviews.filter((r) => isReviewWorthConsidering(r.review));

  if (candidates.length === 0) return undefined;

  const scored = candidates
    .map((r) => ({ review: r, score: scoreReview(r.review) }))
    .sort((a, b) => b.score - a.score);

  return scored[0].review;
}

export function buildHighlightedReviewSummary(r: Review): string {
  let summary = '';

  // base assessment
  if (r.state === 'changes_requested') {
    if (r.reviewCommentsCount >= 4) {
      summary =
        'You provided substantial feedback, requesting changes and leaving detailed comments.';
    } else {
      summary =
        'You requested changes and helped guide the direction of the PR.';
    }
  } else if (r.state === 'commented') {
    if (r.reviewCommentsCount >= 4) {
      summary =
        'You left in-depth feedback and helped improve the PR through active discussion.';
    } else {
      summary = 'You added feedback to help move the PR forward.';
    }
  } else if (r.state === 'approved') {
    if (r.reviewCommentsCount >= 1) {
      summary =
        'You approved the PR after leaving clarifying comments and guidance.';
    } else {
      summary = 'You approved the PR after reviewing the changes.';
    }
  }

  // first reviewer bonus
  if (r.wasFirstReview) {
    summary +=
      ' You were the first to review this PR, helping unblock the author early.';
  }

  // // optional feedback tags
  // if (r.feedbackTags && r.feedbackTags.length > 0) {
  //   const top = r.feedbackTags.slice(0, 3).join(", ");
  //   summary += ` Focus areas: ${top}.`;
  // }

  return summary;
}
