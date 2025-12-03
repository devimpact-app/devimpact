import { PullRequest, Review } from '@/lib/db/schema';
import { ActivityEvent } from '@/types/api/timeline';

export function getActivityEventForPr(pr: PullRequest): ActivityEvent {
  return {
    id: `pr_merged:${pr.id}`,
    kind: 'pr_merged',
    source: 'github',
    occurredAt: pr.mergedAt!.toISOString(),
    actor: {
      login: pr.prAuthorLogin,
    },
    title: `Merged “${pr.title}”`,
    subtitle: `${pr.repoFullName} • #${pr.prNumber}`,
    meta: {
      prTitle: pr.title,
      prNumber: pr.prNumber,
      repoFullName: pr.repoFullName,
      linesChanged: pr.linesChanged ?? undefined,
      filesChanged: pr.filesChanged ?? undefined,
      stateLabel: pr.state,
    },
    links: {
      htmlUrl: pr.htmlUrl ?? undefined,
    },
  };
}

export function getActivityEventForReview(
  r: Review,
  prTitle?: string
): ActivityEvent {
  let title: string;
  let subtitle: string;
  if (prTitle) {
    title = `Reviewed "${prTitle}"`;
    subtitle = `${r.repoFullName} • #${r.prNumber}`;
  } else {
    title = `Reviewed PR #${r.prNumber}`;
    subtitle = `${r.repoFullName}`;
  }
  return {
    id: `review_submitted:${r.id}`,
    kind: 'review_submitted',
    source: 'github',
    occurredAt: r.submittedAt!.toISOString(),
    actor: {
      login: r.reviewerLogin,
    },
    title,
    subtitle,
    meta: {
      prTitle: prTitle,
      prNumber: r.prNumber,
      repoFullName: r.repoFullName,
      reviewLatencySeconds: r.reviewLatencySeconds ?? undefined,
      reviewState: r.state,
      isFirstResponder: r.wasFirstReview ?? undefined,
    },
    links: {
      htmlUrl: r.htmlUrl ?? undefined,
    },
  };
}
