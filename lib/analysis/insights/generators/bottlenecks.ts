import { Insight } from '@/types/api/insights';
import { InsightContext } from '../types';

export function generateBottlenecksInsight(
  ctx: InsightContext
): Insight | null {
  // TODO: find PRs that "should have been fast" but were slow, then look at timing/reviewer
  return null;
}
