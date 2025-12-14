import type { WorkRhythmBucket } from '@/types/api/work-rhythm';

export type ScoredBucket = {
  bucket: WorkRhythmBucket;
  score: number;

  adjustments?: {
    meetingPenaltyApplied?: boolean;
    meetingShare?: number;
    meetingPenaltyFactor?: number; // e.g. 0.88
  };
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

const BAND_ORDER: WorkRhythmBucket['band'][] = [
  'early',
  'morning',
  'midday',
  'afternoon',
  'eve',
];

function meetingPenaltyMultiplier(meetingShare: number | undefined) {
  const s = Math.max(0, Math.min(1, meetingShare ?? 0));

  if (s < 0.1) {
    return { factor: 1, applied: false };
  }

  const t = (s - 0.1) / 0.9;
  const penalty = 0.25 * Math.pow(t, 1.6);
  const factor = 1 - penalty;

  return {
    factor,
    applied: true,
  };
}

export function scoreBucketsForRhythm(
  buckets: WorkRhythmBucket[]
): ScoredBucket[] {
  return buckets
    .filter((b) => b.eventCount > 0)
    .map((b) => {
      const base = b.codeEvents * 1.0 + b.reviewEvents * 0.7;

      const { factor, applied } = meetingPenaltyMultiplier(
        b.meetings?.meetingShare
      );

      return {
        bucket: b,
        score: base * factor,
        adjustments: {
          meetingPenaltyApplied: applied,
          meetingShare: b.meetings?.meetingShare,
          meetingPenaltyFactor: applied ? factor : undefined,
        },
      };
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
