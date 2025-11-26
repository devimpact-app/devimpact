import { Insight } from '@/types/api/insights';
import { InsightContext } from '../types';

export function generateFrictionThemesInsight(
  ctx: InsightContext
): Insight | null {
  const { authoredPrs, prSummariesByPrId } = ctx;

  return null;
}
