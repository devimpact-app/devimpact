import { Insight } from '@/types/api/insights';

export type ScoringInputs = {
  signalStrength: number; // 0–5
  recurrence: number; // 0–5
  impact: number; // 0–5
  novelty: number; // 0–5
  personalization: number; // 0–5
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
