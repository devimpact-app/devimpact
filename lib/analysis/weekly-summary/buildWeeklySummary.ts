import {
  formatRange,
  getTimelineRangeBounds,
  TimelineRangeKey,
} from '@/lib/utils/date';
import { WeeklySummary, WeeklySummarySchema } from '@/types/api/weekly-summary';
import { getAuthoredPrs } from '../activity/getAuthoredPrs';
import { getAuthoredReviews } from '../activity/getAuthoredReviews';
import { getAuthoredCommits } from '../activity/getAuthoredCommits';
import { computeActiveDaysAndMostActiveDay } from './activeDays';

export type BuildWeeklySummaryArgs = {
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
  rangeKey: TimelineRangeKey;
  timezone: string;
};

/**
 * Main orchestrator for generating the Weekly Summary.
 * This returns a fully shaped WeeklySummary object that matches the Zod schema.
 */
export async function buildWeeklySummary({
  userId,
  // TODO: support custom ranges
  rangeStart: _rangeStart,
  rangeEnd: _rangeEnd,
  rangeKey,
  timezone,
}: BuildWeeklySummaryArgs): Promise<WeeklySummary> {
  const { start, end } = getTimelineRangeBounds(rangeKey);
  const range: WeeklySummary['range'] = {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: formatRange(start, end),
  };

  const activityParams = {
    tenantId: userId,
    start,
    end,
  };
  const authoredPrs = await getAuthoredPrs(activityParams);
  const authoredReviews = await getAuthoredReviews(activityParams);
  const uniquePrsReviewed = Array.from(
    new Set(authoredReviews.map((r) => r.githubPrId))
  );
  const authoredCommits = await getAuthoredCommits(activityParams);

  const allDates = [
    ...authoredPrs.map((pr) => pr.createdAt),
    ...authoredPrs.map((pr) => pr.mergedAt).filter(Boolean),
    ...authoredReviews.map((r) => r.submittedAt).filter(Boolean),
    ...authoredCommits.map((c) => c.commit.committedAt),
  ] as Date[];

  const { activeDays, mostActiveDay } = computeActiveDaysAndMostActiveDay(
    allDates,
    timezone
  );
  const softStats: WeeklySummary['softStats'] = {
    prsAuthored: authoredPrs.length,
    prsReviewed: uniquePrsReviewed.length,
    activeDays,
    mostActiveDay,
  };

  // -- Derive focus areas / domains ------------------------------------------
  // Collate PR tags, summary tags, file path categories.
  // For now, empty.

  const whatYouWorkedOn = {
    textSummary: '', // TODO: deterministic short narrative
    focusAreas: [] as string[], // TODO
  };

  // -- Select highlighted PRs -------------------------------------------------
  // Pick 1–3 PRs to represent the week. Use tags, iteration count, size, etc.
  // For now: empty list.

  const highlightedPRs: any[] = []; // TODO

  // -- Derive reviews & collaboration section --------------------------------
  const reviewsCollab = {
    totalReviewed: 0, // TODO
    firstResponderCount: 0, // TODO
    highlightedReview: undefined, // TODO
  };

  // -- Derive friction & follow-ups ------------------------------------------
  // Should include themes like iteration, latency, high-friction reviews.
  const frictionFollowups = {
    items: [] as any[], // TODO
  };

  const summary: WeeklySummary = {
    version: 1,
    range,
    softStats,
    // TODO
    headline: '',
    shipped: highlightedPRs,
    reviewsCollab,
    whatYouWorkedOn,
    frictionFollowups,
    meta: {
      generatedAt: new Date().toISOString(),
      rangeKey,
    },
  };

  return WeeklySummarySchema.parse(summary);
}
