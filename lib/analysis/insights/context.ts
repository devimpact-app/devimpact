import { getWeekBoundsFromOffset } from '@/lib/utils/date';
import type { InsightContext } from './types';
import { getAuthoredPrs } from '../activity/getAuthoredPrs';

export type BuildInsightContextArgs = {
  userId: string;
  timezone: string;
};

export async function buildInsightContext(
  args: BuildInsightContextArgs
): Promise<InsightContext> {
  const { userId, timezone } = args;
  const { start: windowStart, end: windowEnd } = getWeekBoundsFromOffset(0, 4);

  const authoredPrs = await getAuthoredPrs({
    start: windowStart,
    end: windowEnd,
    tenantId: userId,
  });
  const reviews: any[] = []; // TODO
  const prSummariesByPrId = new Map<string, any>(); // TODO

  return {
    userId,
    timezone,
    windowStart,
    windowEnd,
    authoredPrs,
    reviews,
    prSummariesByPrId,
  };
}
