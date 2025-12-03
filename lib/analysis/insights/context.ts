import { getWeekBoundsFromOffset } from '@/lib/utils/date';
import type { InsightContext } from './types';
import { getAuthoredPrs } from '../activity/getAuthoredPrs';
import { getReviewsOnAuthoredPrs } from '../activity/getReviewsOnAuthoredPrs';
import { db } from '@/lib/db/client';
import { prSummaries } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getAuthoredReviews } from '../activity/getAuthoredReviews';

export type BuildInsightContextArgs = {
  userId: string;
  timezone: string;
  limit?: number;
  windowWeeks?: number;

  startOverride?: Date;
  endOverride?: Date;
};

export async function buildInsightContext(
  args: BuildInsightContextArgs
): Promise<InsightContext> {
  const { userId, timezone, windowWeeks, startOverride, endOverride } = args;
  let windowStart: Date;
  let windowEnd: Date;
  if (!startOverride || !endOverride) {
    const { start, end } = getWeekBoundsFromOffset(0, windowWeeks ?? 4);
    windowStart = start;
    windowEnd = end;
  } else {
    windowStart = startOverride;
    windowEnd = endOverride;
  }

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
  const authoredReviews = await getAuthoredReviews(
    {
      start: windowStart,
      end: windowEnd,
      tenantId: userId,
    },
    { joinWithPrs: true }
  );
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
    authoredReviews: authoredReviews.filter((r) => !!r.pr) as any,
  };
}
