import { db } from '@/lib/db/client';
import { PullRequest, pullRequests, Review, reviews } from '@/lib/db/schema';
import { and, between, eq, isNotNull, or } from 'drizzle-orm';
import { ActivityQueryParams } from '../types';

export async function getAuthoredReviews(
  params: ActivityQueryParams,
  opts?: {
    joinWithPrs: boolean;
  }
): Promise<
  {
    review: Review;
    pr?: PullRequest | null;
  }[]
> {
  const { tenantId, start, end } = params;
  if (opts?.joinWithPrs) {
    const reviewRows = await db
      .select({
        review: reviews,
        pr: pullRequests,
      })
      .from(reviews)
      .leftJoin(pullRequests, and(eq(reviews.prId, pullRequests.id)))
      .where(
        and(
          eq(reviews.tenantId, tenantId),
          eq(reviews.reviewerIsTenant, true),
          isNotNull(reviews.submittedAt),
          between(reviews.submittedAt, start, end)
        )
      );
    return reviewRows;
  }
  const reviewRows = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.tenantId, tenantId),
        eq(reviews.reviewerIsTenant, true),
        isNotNull(reviews.submittedAt),
        between(reviews.submittedAt, start, end)
      )
    );
  return reviewRows.map((r) => ({ review: r }));
}
