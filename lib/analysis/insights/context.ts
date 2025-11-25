import { getWeekBoundsFromOffset } from '@/lib/utils/date';
import type { InsightContext } from './types';

export type BuildInsightContextArgs = {
  userId: string;
};

export async function buildInsightContext(
  args: BuildInsightContextArgs
): Promise<InsightContext> {
  const { userId } = args;
  const { start: windowStart, end: windowEnd } = getWeekBoundsFromOffset(0, 4);

  const prs: any[] = []; // TODO
  const reviews: any[] = []; // TODO
  const prSummariesByPrId = new Map<string, any>(); // TODO

  return {
    userId,
    windowStart,
    windowEnd,
    prs,
    reviews,
    prSummariesByPrId,
  };
}
