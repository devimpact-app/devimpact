import type { WorkRhythmBucket } from '@/types/api/work-rhythm';

export type ScoredBucket = {
  bucket: WorkRhythmBucket;
  score: number;
};

const DAY_ORDER: WorkRhythmBucket['day'][] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

const BAND_ORDER: WorkRhythmBucket['band'][] = ['early', 'am', 'pm', 'eve'];

export function scoreBucketsForRhythm(
  buckets: WorkRhythmBucket[]
): ScoredBucket[] {
  return buckets
    .filter((b) => b.eventCount > 0)
    .map((b) => {
      // code heavier than reviews
      const score = b.codeEvents * 1.0 + b.reviewEvents * 0.7;
      return { bucket: b, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      // stable tie-breaking
      const dayDiff =
        DAY_ORDER.indexOf(a.bucket.day) - DAY_ORDER.indexOf(b.bucket.day);
      if (dayDiff !== 0) return dayDiff;

      return (
        BAND_ORDER.indexOf(a.bucket.band) - BAND_ORDER.indexOf(b.bucket.band)
      );
    });
}
