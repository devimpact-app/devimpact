import {
  WeeklyActivity,
  WeeklyActivitySchema,
} from '@/types/api/weekly-activity';
import { getAuthoredPrs } from '../../timeline/db/getAuthoredPrs';
import { getAuthoredReviews } from '../../timeline/db/getAuthoredReviews';
import { getAuthoredCommits } from '../../timeline/db/getAuthoredCommits';
import { computeActiveDaysAndMostActiveDay } from './activeDays';
import { deriveFrictionFollowups } from './frictionItems';
import { getWeeklyMeetingTotals } from './calendar';

export type BuildWeeklyActivityArgs = {
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
  timezone: string;
};

/**
 * Main orchestrator for generating the Weekly Summary.
 * This returns a fully shaped WeeklySummary object that matches the Zod schema.
 */
export async function buildWeeklyActivity({
  userId,
  rangeStart: start,
  rangeEnd: end,
  timezone,
}: BuildWeeklyActivityArgs): Promise<WeeklyActivity> {
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

  const calendarData = await getWeeklyMeetingTotals({
    ...activityParams,
    timezone,
  });

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
  const softStats: WeeklyActivity['softStats'] = {
    prsAuthored: mergedPrs.length,
    prsReviewed: uniquePrsReviewed.length,
    activeDays,
    mostActiveDay,
    meetingMinutes: calendarData?.meetingMinutes,
    meetingCount: calendarData?.meetingCount,
  };

  // friction & follow-ups
  const frictionFollowups = deriveFrictionFollowups({
    authoredPrs: mergedPrs,
  });

  const summary: WeeklyActivity = {
    softStats,
    frictionFollowups,
    calendar: calendarData,
  };

  return WeeklyActivitySchema.parse(summary);
}
