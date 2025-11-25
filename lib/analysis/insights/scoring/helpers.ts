import { Insight, InsightKind } from '@/types/api/insights';
import { InsightDraft } from '../types';
import { scoreFastLoops } from './fast-loops';

export type ScoringInputs = {
  signalStrength: number; // 0–5
  recurrence: number; // 0–5
  impact: number; // 0–5
  novelty: number; // 0–5
  personalization: number; // 0–5
};

export type ScoringStrategy = (draft: InsightDraft) => ScoringInputs;

export const scoringStrategies: Partial<Record<InsightKind, ScoringStrategy>> =
  {
    fast_loops: scoreFastLoops,
    // friction_themes: scoreFrictionThemes,
    // ...add others over time
  };

export function scoreInsightBase(params: {
  signalStrength: number; // 0–5
  recurrence: number; // 0–5
  impact: number; // 0–5
  novelty: number; // 0–5
  personalization: number; // 0–5
}): number {
  const { signalStrength, recurrence, impact, novelty, personalization } =
    params;

  const raw =
    signalStrength * 3 +
    recurrence * 2 +
    impact * 3 +
    novelty * 1 +
    personalization * 2;

  // normalize to 0–100
  return Math.max(0, Math.min(100, raw));
}

export function pickTopInsights(
  insights: Insight[],
  limit: number,
  minScore: number = 0
): Insight[] {
  return insights
    .filter((i) => i.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function attachScore(draft: InsightDraft): Insight {
  const strategy = scoringStrategies[draft.kind];

  let inputs: ScoringInputs;

  if (strategy) {
    inputs = strategy(draft);
  } else {
    // final fallback: neutral score
    inputs = {
      signalStrength: 3,
      recurrence: 3,
      impact: 3,
      novelty: 3,
      personalization: 3,
    };
  }

  const score = scoreInsightBase(inputs);

  return { ...draft, score };
}
