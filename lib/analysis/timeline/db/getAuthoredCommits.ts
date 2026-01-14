import { db } from '@/lib/db/client';
import {
  githubPrCommits,
  GithubPRCommit,
  githubPrs,
  pullRequests,
  GithubPR,
  PullRequest,
} from '@/lib/db/schema';
import { and, between, eq, isNotNull, or } from 'drizzle-orm';
import { ActivityQueryParams } from '../types';

export async function getAuthoredCommits(params: ActivityQueryParams): Promise<
  {
    commit: GithubPRCommit;
    rawPr: GithubPR | null;
    pr: PullRequest | null;
  }[]
> {
  const { tenantId, start, end } = params;
  const prRows = await db
    .select({
      commit: githubPrCommits,
      rawPr: githubPrs,
      pr: pullRequests,
    })
    .from(githubPrCommits)
    .leftJoin(githubPrs, eq(githubPrCommits.prId, githubPrs.id))
    .leftJoin(pullRequests, eq(pullRequests.githubPrId, githubPrs.id))
    .where(
      and(
        eq(githubPrCommits.tenantId, tenantId),
        eq(pullRequests.authorIsTenant, true),
        isNotNull(githubPrCommits.committedAt),
        between(githubPrCommits.committedAt, start, end)
      )
    );
  return prRows;
}
