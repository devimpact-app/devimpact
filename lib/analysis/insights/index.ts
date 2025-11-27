import { buildInsightContext } from './context';
import type { Insight } from '@/types/api/insights';
import type { BuildInsightContextArgs } from './context';

import { generateFastLoopsInsight } from './generators/fast-loops';
import { generateFrictionThemesInsight } from './generators/friction-themes';
import { generateReviewerBottleneckInsight } from './generators/reviewer-bottlenecks';
import { generateAvailabilityDeadzoneInsight } from './generators/availability-bottlenecks';
import { generateContentBottlenecksInsight } from './generators/content-bottlenecks';
import { pickTopInsights } from './scoring';

const GENERATORS = [
  generateFastLoopsInsight,
  generateFrictionThemesInsight,
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
    const insight = gen(ctx);
    if (insight) {
      candidates.push(insight);
    }
  }

  const top = pickTopInsights(candidates, args.limit ?? 3, 0); // default=3 for dashboard

  return {
    insights: top,
    windowStart: ctx.windowStart,
    windowEnd: ctx.windowEnd,
  };
}
