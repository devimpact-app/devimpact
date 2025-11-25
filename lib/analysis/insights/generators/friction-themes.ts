import { Insight } from '@/types/api/insights';
import { InsightContext } from '../types';

export function generateFrictionThemesInsight(
  ctx: InsightContext
): Insight | null {
  // For v0 UI work: always return a synthetic insight.
  // Later, this will use ctx.prs + their summaries' firstPassFeedbackTags.

  return {
    id: 'friction_themes_stub',
    kind: 'friction_themes',

    title: 'Test coverage and structure feedback drove most review friction',
    emphasis: 'Most common sources of requested changes',

    body:
      'Across your recent PRs, reviewers most frequently asked for updates ' +
      'related to test coverage, structural clarity, and small architectural improvements. ' +
      'These themes appeared consistently in first-pass feedback.',

    stats: [
      { label: 'PRs affected', value: '5 of 12' },
      { label: 'Top theme', value: 'test coverage' },
      { label: 'Avg. reviews before approval', value: '1.8' },
    ],

    severity: 'info',
    score: 72, // medium-high priority; sits near Fast Loops but slightly lower

    timeWindowLabel: 'Last 4 weeks',

    meta: {
      simulated: true,
      topThemes: ['test coverage', 'structure', 'architecture'],
    },
  };
}
