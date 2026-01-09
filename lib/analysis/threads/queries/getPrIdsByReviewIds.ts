import { db } from '@/lib/db/client';
import { reviews } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export async function getPrIdsByReviewIds(
  tenantId: string,
  reviewIds: string[]
): Promise<Record<string, string>> {
  if (!reviewIds.length) return {};

  const CHUNK = 500;
  const out: Record<string, string> = {};

  for (let i = 0; i < reviewIds.length; i += CHUNK) {
    const chunk = reviewIds.slice(i, i + CHUNK);

    const rows = await db
      .select({
        reviewId: reviews.id,
        prId: reviews.prId,
      })
      .from(reviews)
      .where(and(eq(reviews.tenantId, tenantId), inArray(reviews.id, chunk)));

    for (const r of rows) {
      out[r.reviewId] = r.prId;
    }
  }

  return out;
}
