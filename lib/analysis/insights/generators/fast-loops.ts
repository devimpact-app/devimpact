import { Insight } from '@/types/api/insights';
import { InsightContext } from '../types';

export function generateFastLoopsInsight(ctx: InsightContext): Insight | null {
  // For now we always return a synthetic insight just to render UI.
  // Later you’ll use `ctx.prs`, `ctx.reviews`, etc. to compute it.

  return {
    id: 'fast_loops_stub',
    kind: 'fast_loops',

    title: 'Your small morning PRs merged 2.3× faster',
    emphasis: '2.3× faster turnaround',
    body:
      'PRs opened before noon with fewer than 250 changed lines tended to move ' +
      'from “ready for review” to merge significantly faster than your baseline.',

    stats: [
      { label: 'Sample size', value: '7 PRs' },
      { label: 'Fast median', value: '4.1h' },
      { label: 'Overall median', value: '9.5h' },
    ],

    severity: 'positive',
    score: 78, // just a middle-high score so it ranks decently in list

    timeWindowLabel: 'Last 4 weeks',

    meta: {
      // Optional debug fields the FE won’t render
      simulated: true,
      baselineMedianHours: 9.5,
      fastMedianHours: 4.1,
    },
  };
}
