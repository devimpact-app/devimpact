import { db } from '@/lib/db/client';
import { PullRequest, pullRequests, reviews } from '@/lib/db/schema';
import { and, desc, eq, gte, isNotNull, isNull, or } from 'drizzle-orm';

export async function getReviewRequestedPrs(params: {
  tenantId: string;
  lowerBound: Date;
}): Promise<PullRequest[]> {
  const { tenantId, lowerBound } = params;
  const prRows = await db
    .select({
      pr: pullRequests,
    })
    .from(pullRequests)
    .leftJoin(
      reviews,
      and(
        eq(reviews.prId, pullRequests.id),
        eq(reviews.reviewerIsTenant, true),
        isNotNull(reviews.submittedAt),
        gte(reviews.submittedAt, pullRequests.tenantReviewRequestedAt)
      )
    )
    .where(
      and(
        eq(pullRequests.tenantId, tenantId),
        eq(pullRequests.authorIsTenant, false),
        isNull(reviews.id),
        eq(pullRequests.state, 'open'),
        eq(pullRequests.tenantReviewRequested, true),
        isNotNull(pullRequests.tenantReviewRequestedAt),
        gte(pullRequests.tenantReviewRequestedAt, lowerBound)
      )
    )
    .orderBy(desc(pullRequests.tenantReviewRequestedAt))
    .limit(50);
  return prRows.map((row) => row.pr);
}
