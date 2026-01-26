import { PullRequest } from '@/lib/db/schema';

export function getPrRelatedItem(pr: PullRequest) {
  return {
    id: pr.id,
    entityType: 'pull_request' as const,
    title: pr.title,
    htmlUrl: pr.htmlUrl ?? undefined,
    subtitle: `PR #${pr.prNumber}`,
    meta: {
      prNumber: pr.prNumber,
    },
  };
}
