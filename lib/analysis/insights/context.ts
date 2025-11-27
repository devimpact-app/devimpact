import { getWeekBoundsFromOffset } from '@/lib/utils/date';
import type { InsightContext } from './types';
import { getAuthoredPrs } from '../activity/getAuthoredPrs';
import { getReviewsOnAuthoredPrs } from '../activity/getReviewsOnAuthoredPrs';
import { db } from '@/lib/db/client';
import { prSummaries } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export type BuildInsightContextArgs = {
  userId: string;
  timezone: string;
  limit?: number;
  windowWeeks?: number;
};

export async function buildInsightContext(
  args: BuildInsightContextArgs
): Promise<InsightContext> {
  const { userId, timezone, windowWeeks } = args;
  const { start: windowStart, end: windowEnd } = getWeekBoundsFromOffset(
    0,
    windowWeeks ?? 4
  );

  const authoredPrs = await getAuthoredPrs({
    start: windowStart,
    end: windowEnd,
    tenantId: userId,
  });
  const reviewsOnAuthoredPrs = await getReviewsOnAuthoredPrs({
    start: windowStart,
    end: windowEnd,
    tenantId: userId,
  });
  const queriedSummaries = await db
    .select()
    .from(prSummaries)
    .where(
      and(
        inArray(
          prSummaries.prId,
          authoredPrs.map((pr) => pr.id)
        ),
        eq(prSummaries.tenantId, userId)
      )
    )
    .limit(1);
  const prSummariesByPrId = queriedSummaries.reduce((acc, summary) => {
    acc.set(summary.prId, summary);
    return acc;
  }, new Map());

  return {
    userId,
    timezone,
    windowStart,
    windowEnd,
    authoredPrs,
    reviewsOnAuthoredPrs: reviewsOnAuthoredPrs.map((r) => r.review),
    prSummariesByPrId,
  };
}
