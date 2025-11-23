import { db } from '@/lib/db/client';
import { Review, reviews } from '@/lib/db/schema';
import { and, between, eq, isNotNull, or } from 'drizzle-orm';
import { ActivityQueryParams } from './types';

export async function getAuthoredReviews(
  params: ActivityQueryParams
): Promise<Review[]> {
  const { tenantId, start, end } = params;
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
  return reviewRows;
}
