import { db } from '@/lib/db/client';
import {
  pullRequests, // normalized PRs
  githubPrFiles, // files
  githubReviewComments,
  githubPrs,
  GithubPRFile,
  GithubReviewComment,
  PullRequest,
  reviews,
  Review,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function loadPrSummaryContext(opts: {
  tenantId: string;
  prId: string;
}) {
  const { tenantId, prId } = opts;

  const [normPr] = await db
    .select()
    .from(pullRequests)
    .where(and(eq(pullRequests.tenantId, tenantId), eq(pullRequests.id, prId)))
    .limit(1);

  if (!normPr) return null;

  const [pr] = await db
    .select()
    .from(githubPrs)
    .where(
      and(eq(githubPrs.tenantId, tenantId), eq(githubPrs.id, normPr.githubPrId))
    )
    .limit(1);

  if (!pr) return null;

  const [files, normReviews, reviewComments] = await Promise.all([
    db
      .select()
      .from(githubPrFiles)
      .where(
        and(eq(githubPrFiles.tenantId, tenantId), eq(githubPrFiles.prId, pr.id))
      ),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.tenantId, tenantId), eq(reviews.prId, normPr.id))),
    db
      .select()
      .from(githubReviewComments)
      .where(
        and(
          eq(githubReviewComments.tenantId, tenantId),
          eq(githubReviewComments.prId, pr.id)
        )
      ),
  ]);

  return {
    normPr: normPr as PullRequest,
    files: files as GithubPRFile[],
    reviews: normReviews as Review[],
    reviewComments: reviewComments as GithubReviewComment[],
  };
}
