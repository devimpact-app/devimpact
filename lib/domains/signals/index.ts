import { Signal } from '@/types/api/signals';
import { BuildSignalContextArgs, buildSignalsContext } from './context';
import { generateMultipleReviewRoundsSignals } from './generators/multipleReviewRounds';
import { generateSlowFirstReviewSignals } from './generators/slowFirstReview';
import { generateLongIdleGapSignals } from './generators/longIdleGap';
import { generateLargeChangeSignals } from './generators/largeChange';
import { compareSignals, dedupeByRelatedEntity } from './ordering';

const GENERATORS = [
  generateMultipleReviewRoundsSignals,
  generateSlowFirstReviewSignals,
  generateLongIdleGapSignals,
  generateLargeChangeSignals,
];

export async function buildSignals(
  args: BuildSignalContextArgs & { limit?: number; dedupeByRelated?: boolean }
): Promise<{
  signals: Signal[];
  windowStart: Date;
  windowEnd: Date;
}> {
  const ctx = await buildSignalsContext(args);

  const candidates: Signal[] = GENERATORS.flatMap((fn) => fn(ctx));

  const maybeDeduped =
    args.dedupeByRelated === false
      ? candidates
      : dedupeByRelatedEntity(candidates);
  const sorted = maybeDeduped.sort(compareSignals);
  const limit = typeof args.limit === 'number' ? args.limit : undefined;
  const signals = limit ? sorted.slice(0, limit) : sorted;

  return {
    signals,
    windowStart: ctx.windowStart,
    windowEnd: ctx.windowEnd,
  };
}
