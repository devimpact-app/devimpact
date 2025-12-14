import type { WorkRhythmBucket } from '@/types/api/work-rhythm';
import { scoreBucketsForRhythm } from './scoring';

// TODO: update later if allowing more time options
const WEEKS = 4;

export function computeAvgDeepWorkBlocksPerWeek(params: {
  buckets: WorkRhythmBucket[];
}): number {
  const { buckets } = params;
  const scored = scoreBucketsForRhythm(buckets);

  if (scored.length === 0) return 0;

  const MIN_SCORE = 2;
  const allowedBands: WorkRhythmBucket['band'][] = [
    'early',
    'morning',
    'midday',
    'afternoon',
  ];

  const deepBlocks = scored.filter(
    ({ bucket, score }) =>
      score >= MIN_SCORE && allowedBands.includes(bucket.band)
  ).length;

  const avg = deepBlocks / WEEKS;

  // Optional: round to one decimal
  return Math.round(avg * 10) / 10;
}
