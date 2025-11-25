import { buildInsightContext } from './context';
import { pickTopInsights } from './scoring';
import type { Insight } from '@/types/api/insights';
import type { BuildInsightContextArgs } from './context';

import { generateFastLoopsInsight } from './generators/fast-loops';
import { generateFrictionThemesInsight } from './generators/friction-themes';
import { generateBottlenecksInsight } from './generators/bottlenecks';

const GENERATORS = [
  generateFastLoopsInsight,
  generateFrictionThemesInsight,
  generateBottlenecksInsight,
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
    if (insight) candidates.push(insight);
  }

  const top = pickTopInsights(candidates, 3, 0); // limit=3 for dashboard

  return {
    insights: top,
    windowStart: ctx.windowStart,
    windowEnd: ctx.windowEnd,
  };
}
