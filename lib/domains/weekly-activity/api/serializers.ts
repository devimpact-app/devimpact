import { PullRequest, Review } from '@/lib/db/schema';
import { PR_TYPE_LABELS } from '@/lib/integrations/openai/prompts/prSummary';
import {
  HighlightedReview,
  HighlightReason,
  ShippedItem,
} from '@/types/api/weekly-activity';

export function serializeShippedItem(
  pr: PullRequest,
  highlightReason: HighlightReason,
  prSummariesById?: Map<string, any>
): ShippedItem {
  const summary = prSummariesById ? prSummariesById.get(pr.id) : null;
  return {
    prId: pr.id,
    repo: pr.repoFullName,
    number: pr.prNumber,
    title: pr.title,
    shortSummary: summary?.shortSummary || '',
    tags: (summary?.typeTags ?? []).map(
      (rawTag: any) => PR_TYPE_LABELS[rawTag]
    ),
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

export function serializeHighlightedReview({
  review,
  pr,
}: {
  review: Review;
  pr: PullRequest;
}): HighlightedReview {
  return {
    prId: pr.id,
    repo: pr.repoFullName,
    number: pr.prNumber,
    title: pr.title,
    htmlUrl: pr.htmlUrl,
    shortSummary: buildHighlightedReviewSummary(review),
    tags: [],
    submittedAt: review.submittedAt
      ? review.submittedAt.toISOString()
      : undefined,
    reviewLatencyHours: review.reviewLatencySeconds,
    reviewCommentsCount: review.reviewCommentsCount,
    isApproval: review.isApproval,
    isBlocking: review.isBlockingReview,
    isFirstReview: review.wasFirstReview,

    highlightReason: 'other',
  };
}
