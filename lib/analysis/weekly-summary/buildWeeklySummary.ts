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

export type BuildWeeklySummaryArgs = {
  userId: string;
  rangeStart?: Date;
  rangeEnd?: Date;
  rangeKey: TimelineRangeKey;
  timezone: string;
};

/**
 * Main orchestrator for generating the Weekly Summary.
 * This returns a fully shaped WeeklySummary object that matches the Zod schema.
 */
export async function buildWeeklySummary({
  userId,
  rangeKey,
  timezone,
  // TODO: support custom ranges
  rangeStart: _rangeStart,
  rangeEnd: _rangeEnd,
}: BuildWeeklySummaryArgs): Promise<WeeklySummary> {
  // Date range
  const { start, end } = getTimelineRangeBounds(rangeKey);
  const range: WeeklySummary['range'] = {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: formatRange(start, end),
  };

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

  const allDates = [
    ...authoredPrs.map((pr) => pr.createdAt),
    ...authoredPrs.map((pr) => pr.mergedAt).filter(Boolean),
    ...authoredReviews.map((r) => r.review.submittedAt).filter(Boolean),
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

  // Highlighted shipped PRs
  const mergedPrs = authoredPrs.filter((pr) => !!pr.mergedAt);
  const summariesByPrId = new Map<string, any>();
  for (const pr of mergedPrs) {
    const { row } = await getOrGeneratePrSummary({
      tenantId: userId,
      prId: pr.id,
    });
    summariesByPrId.set(pr.id, row);
  }

  const highlightedAuthored = pickHighlightedAuthoredPrs(mergedPrs);
  const shipped = await Promise.all(
    highlightedAuthored.map(async (pr) => {
      const summary = summariesByPrId.get(pr.id);

      return {
        prId: pr.id,
        repo: pr.repoFullName,
        number: pr.prNumber,
        title: pr.title,
        shortSummary: summary.shortSummary,
        tags: summary.tags ?? [],
        htmlUrl: pr.htmlUrl ?? undefined,
      } as WeeklySummary['shipped'][0];
    })
  );

  // What you worked on - focus
  const allFocusTags = mergedPrs.flatMap((pr) => {
    const s = summariesByPrId.get(pr.id);
    return s?.tags ?? [];
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
  const highlightedReviewed = pickHighlightedReview(authoredReviews);
  if (highlightedReviewed) {
    const pr = highlightedReviewed.pr!;
    reviewsCollab.highlightedReview = {
      prId: pr.id,
      repo: pr.repoFullName,
      number: pr.prNumber,
      title: pr.title,
      htmlUrl: pr.htmlUrl,
      shortSummary: buildHighlightedReviewSummary(highlightedReviewed.review),
      tags: [],
    };
  }

  // -- Derive friction & follow-ups ------------------------------------------
  // Should include themes like iteration, latency, high-friction reviews.
  const frictionFollowups = {
    items: [] as any[], // TODO
  };

  const summary: WeeklySummary = {
    version: 1,
    range,
    softStats,
    shipped,
    whatYouWorkedOn,
    reviewsCollab,
    // TODO
    headline: 'Wow test',
    frictionFollowups,
    meta: {
      generatedAt: new Date().toISOString(),
      rangeKey,
    },
  };

  return WeeklySummarySchema.parse(summary);
}
