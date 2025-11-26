import { buildInsightContext } from './context';
import type { Insight } from '@/types/api/insights';
import type { BuildInsightContextArgs } from './context';

import { generateFastLoopsInsight } from './generators/fast-loops';
import { generateFrictionThemesInsight } from './generators/friction-themes';
import { generateReviewerBottleneckInsight } from './generators/reviewer-bottlenecks';
import { attachScore, pickTopInsights } from './scoring/helpers';
import { generateAvailabilityDeadzoneInsight } from './generators/availability-bottlenecks';
import { generateContentBottlenecksInsight } from './generators/content-bottlenecks';

const GENERATORS = [
  generateFastLoopsInsight,
  // generateFrictionThemesInsight,
  generateReviewerBottleneckInsight,
  generateAvailabilityDeadzoneInsight,
  generateContentBottlenecksInsight,
];

export async function buildInsights(args: BuildInsightContextArgs): Promise<{
  insights: Insight[];
  windowStart: Date;
  windowEnd: Date;
}> {
  const ctx = await buildInsightContext(args);

  const candidates: Insight[] = [];

  for (const gen of GENERATORS) {
    const draftInsight = gen(ctx);
    if (draftInsight) {
      const insight = attachScore(draftInsight);
      candidates.push(insight);
    }
  }

  const top = pickTopInsights(candidates, 3, 0); // limit=3 for dashboard

  return {
    insights: top,
    windowStart: ctx.windowStart,
    windowEnd: ctx.windowEnd,
  };
}
