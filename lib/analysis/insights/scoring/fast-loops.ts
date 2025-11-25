import { ScoringStrategy } from './helpers';

export const scoreFastLoops: ScoringStrategy = (draft) => {
  const m = draft.metrics ?? {};
  const baseline = Number(m.baselineMedianHours ?? 0);
  const fast = Number(m.fastMedianHours ?? 0);
  const sampleSize = Number(m.sampleSize ?? 0);
  const totalPrCount = Number(m.totalPrCount ?? 0);

  const diff = baseline - fast;
  const pctImprovement = baseline > 0 ? diff / baseline : 0;
  const recurrenceRatio = totalPrCount > 0 ? sampleSize / totalPrCount : 0;

  // 1. signalStrength — how dramatic?
  const signalStrength =
    pctImprovement >= 0.5
      ? 5
      : pctImprovement >= 0.3
        ? 4
        : pctImprovement >= 0.15
          ? 3
          : pctImprovement >= 0.05
            ? 2
            : 1;

  // 2. recurrence — how often does this happen?
  const recurrence =
    recurrenceRatio >= 0.4
      ? 5
      : recurrenceRatio >= 0.25
        ? 4
        : recurrenceRatio >= 0.15
          ? 3
          : recurrenceRatio >= 0.08
            ? 2
            : sampleSize > 0
              ? 1
              : 0;

  // 3. impact — absolute hours saved
  const impact =
    diff >= 12 ? 5 : diff >= 6 ? 4 : diff >= 3 ? 3 : diff >= 1 ? 2 : 1;

  // 4. novelty — v0: just medium; later compare to prior window
  const novelty = 3;

  // 5. personalization — specific & recurring -> higher
  const personalization =
    recurrenceRatio >= 0.3 || pctImprovement >= 0.3 ? 4 : 2;

  return {
    signalStrength,
    recurrence,
    impact,
    novelty,
    personalization,
  };
};
