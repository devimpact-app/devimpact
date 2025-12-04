import { formatRange } from '@/lib/utils/date';
import {
  ShippedItem,
  WeeklySummary,
  WeeklySummarySchema,
} from '@/types/api/weekly-summary';
import { getAuthoredPrs } from '../activity/getAuthoredPrs';
import { getAuthoredReviews } from '../activity/getAuthoredReviews';
import { getAuthoredCommits } from '../activity/getAuthoredCommits';
import { computeActiveDaysAndMostActiveDay } from './activeDays';
import { pickHighlightedAuthoredPrs } from './highlightedPrs';
import { getOrGeneratePrSummary } from '@/lib/integrations/openai/services/summarizePR';
import {
  buildTagFrequencyMap,
  buildWhatYouWorkedOnSummary,
  pickTopFocusAreas,
} from './focusAreas';
import {
  buildHighlightedReviewSummary,
  pickHighlightedReview,
} from './highlightedReviews';
import { deriveFrictionFollowups } from './frictionItems';
import { buildWeeklyHeadline } from './headline';
import { mapWithConcurrency } from '@/lib/utils/concurrency';

export type BuildWeeklySummaryArgs = {
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
  timezone: string;
};

/**
 * Main orchestrator for generating the Weekly Summary.
 * This returns a fully shaped WeeklySummary object that matches the Zod schema.
 */
export async function buildWeeklySummary({
  userId,
  rangeStart: start,
  rangeEnd: end,
  timezone,
}: BuildWeeklySummaryArgs): Promise<WeeklySummary> {
  // Soft stats
  const activityParams = {
    tenantId: userId,
    start,
    end,
  };
  const authoredPrs = await getAuthoredPrs(activityParams);
  const authoredReviews = await getAuthoredReviews(activityParams, {
    joinWithPrs: true,
  });
  const uniquePrsReviewed = Array.from(
    new Set(authoredReviews.map((r) => r.review.prId))
  );
  const authoredCommits = await getAuthoredCommits(activityParams);

  const allDates = (
    [
      ...authoredPrs.map((pr) => pr.createdAt),
      ...authoredPrs.map((pr) => pr.mergedAt).filter(Boolean),
      ...authoredReviews.map((r) => r.review.submittedAt).filter(Boolean),
      ...authoredCommits.map((c) => c.commit.committedAt),
    ] as Date[]
  ).filter((d) => d >= start && d <= end);

  const { activeDays, mostActiveDay } = computeActiveDaysAndMostActiveDay(
    allDates,
    timezone
  );
  const mergedPrs = authoredPrs.filter((pr) => !!pr.mergedAt);
  const softStats: WeeklySummary['softStats'] = {
    prsAuthored: mergedPrs.length,
    prsReviewed: uniquePrsReviewed.length,
    activeDays,
    mostActiveDay,
  };

  // Highlighted shipped PRs
  const summariesByPrId = new Map<string, any>();
  const summaryResults = await mapWithConcurrency(mergedPrs, 5, async (pr) => {
    const { row } = await getOrGeneratePrSummary({
      tenantId: userId,
      prId: pr.id,
    });
    return { prId: pr.id, row };
  });
  for (const { prId, row } of summaryResults) {
    summariesByPrId.set(prId, row);
  }

  const shipped = pickHighlightedAuthoredPrs(mergedPrs, summariesByPrId);

  // What you worked on - focus
  const allFocusTags = mergedPrs.flatMap((pr) => {
    const s = summariesByPrId.get(pr.id);
    return s?.typeTags ?? [];
  });
  const freq = buildTagFrequencyMap(allFocusTags);
  const focusAreas = pickTopFocusAreas(freq);
  const textSummary = buildWhatYouWorkedOnSummary(focusAreas);
  const whatYouWorkedOn: WeeklySummary['whatYouWorkedOn'] = {
    textSummary,
    focusAreas,
  };

  // Reviews and collaboration
  let reviewsCollab: WeeklySummary['reviewsCollab'] = {
    totalReviewed: uniquePrsReviewed.length,
    firstResponderCount: authoredReviews.filter((r) => r.review.wasFirstReview)
      .length,
  };
  const highlightedReviewed = pickHighlightedReview(authoredReviews as any);
  if (highlightedReviewed) {
    reviewsCollab.highlightedReview = highlightedReviewed;
  }

  // friction & follow-ups
  const frictionFollowups = deriveFrictionFollowups({
    authoredPrs: authoredPrs,
  });

  // Headline
  const headline = buildWeeklyHeadline({
    softStats,
    shipped,
    whatYouWorkedOn,
    reviewsCollab,
    frictionFollowups,
  });

  const summary: WeeklySummary = {
    version: 1,
    range: {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      label: formatRange(start, end),
    },
    softStats,
    shipped,
    whatYouWorkedOn,
    reviewsCollab,
    frictionFollowups,
    headline,
    meta: {
      generatedAt: new Date().toISOString(),
    },
  };

  return WeeklySummarySchema.parse(summary);
}
