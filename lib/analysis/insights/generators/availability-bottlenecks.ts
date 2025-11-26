import { computeMedianClamped } from '@/lib/utils/math';
import { InsightContext, InsightDraft } from '../types';
import {
  formatTimeOfDayLabel,
  formatWeekdayLabel,
  getTimeOfDayBucket,
  MAX_HOURS_CUTOFF,
  TimeOfDayBucket,
} from './shared';
import { getLocalWeekdayIndex, toLocalDate } from '@/lib/utils/date';

export function generateAvailabilityDeadzoneInsight(
  ctx: InsightContext
): InsightDraft | null {
  const { authoredPrs, reviewsOnAuthoredPrs, timezone } = ctx;
  if (!authoredPrs || !reviewsOnAuthoredPrs) return null;

  // Map PRs by id so we can find ready-at timestamps
  const prsById = new Map<string, (typeof authoredPrs)[number]>();
  for (const pr of authoredPrs) {
    prsById.set(pr.id, pr);
  }

  type Sample = {
    bucketKey: string; // `${weekday}:${timeBucket}`
    weekdayIndex: number; // 0–6 local
    timeBucket: TimeOfDayBucket;
    latencyHours: number;
  };

  const samples: Sample[] = [];

  for (const r of reviewsOnAuthoredPrs) {
    if (!r.wasFirstReview) continue;

    const pr = prsById.get(r.prId);
    if (!pr || !pr.lastReadyForReviewAt) continue;

    const seconds = r.reviewLatencySeconds ?? 0;
    if (seconds <= 0) continue;

    const hours = seconds / 3600;
    if (hours <= 0 || hours > MAX_HOURS_CUTOFF) continue;

    const readyLocal = toLocalDate(pr.lastReadyForReviewAt, timezone);
    const weekdayIdx = getLocalWeekdayIndex(pr.lastReadyForReviewAt, timezone); // 0–6 in that tz
    const timeBucket = getTimeOfDayBucket(readyLocal.getHours());
    const bucketKey = `${weekdayIdx}:${timeBucket}`;

    samples.push({
      bucketKey,
      weekdayIndex: weekdayIdx,
      timeBucket,
      latencyHours: hours,
    });
  }

  if (samples.length < 8) {
    // not enough signal to do time-of-week analysis
    return null;
  }

  const baselineMedianHours = computeMedianClamped(
    samples.map((s) => s.latencyHours),
    { min: 0, max: MAX_HOURS_CUTOFF }
  );
  if (baselineMedianHours <= 0) return null;

  // Aggregate per bucket
  type BucketStats = {
    bucketKey: string;
    weekdayIndex: number;
    timeBucket: TimeOfDayBucket;
    count: number;
    medianLatencyHours: number;
    slowdownRatio: number;
    absoluteDiff: number;
  };

  const latenciesByBucket = new Map<string, Sample[]>();
  for (const s of samples) {
    const arr = latenciesByBucket.get(s.bucketKey) ?? [];
    arr.push(s);
    latenciesByBucket.set(s.bucketKey, arr);
  }

  const bucketStats: BucketStats[] = [];

  for (const [key, bucketSamples] of latenciesByBucket.entries()) {
    if (bucketSamples.length < 3) continue; // min sample per bucket

    const medianLatencyHours = computeMedianClamped(
      bucketSamples.map((s) => s.latencyHours),
      { min: 0, max: MAX_HOURS_CUTOFF }
    );
    if (medianLatencyHours <= 0) continue;

    const slowdownRatio =
      baselineMedianHours > 0 ? medianLatencyHours / baselineMedianHours : 1;
    const absoluteDiff = medianLatencyHours - baselineMedianHours;

    // Heuristic: "dead zone" if >= 1.5x slower and at least 3h worse
    const isDeadZone = slowdownRatio >= 1.4 && absoluteDiff >= 0.5;
    if (!isDeadZone) continue;

    const sample = bucketSamples[0];
    bucketStats.push({
      bucketKey: key,
      weekdayIndex: sample.weekdayIndex,
      timeBucket: sample.timeBucket,
      count: bucketSamples.length,
      medianLatencyHours,
      slowdownRatio,
      absoluteDiff,
    });
  }

  if (bucketStats.length === 0) {
    return null;
  }

  // Pick the worst "dead zone": highest slowdown, then most samples
  bucketStats.sort((a, b) => {
    if (b.slowdownRatio !== a.slowdownRatio) {
      return b.slowdownRatio - a.slowdownRatio;
    }
    return b.count - a.count;
  });

  const worst = bucketStats[0];

  const dayLabel = formatWeekdayLabel(worst.weekdayIndex);
  const timeLabel = formatTimeOfDayLabel(worst.timeBucket);
  const bucketMedianLabel = `${worst.medianLatencyHours.toFixed(1)}h`;
  const baselineLabel = `${baselineMedianHours.toFixed(1)}h`;
  const slowdownPct = Math.round((worst.slowdownRatio - 1) * 100);
  const timeframe = 'last 4 weeks';

  const title = `You hit a review dead zone on ${dayLabel.toLowerCase()} ${timeLabel}`;
  const emphasis = `${bucketMedianLabel} median first review vs ${baselineLabel} overall`;

  const body = [
    `Over the ${timeframe}, PRs you sent for review on ${dayLabel.toLowerCase()} ${timeLabel} waited much longer for a first review.`,
    `Median time to first review in that window was ${bucketMedianLabel}, about ${slowdownPct}% slower than your overall median of ${baselineLabel}.`,
    `When it’s possible, avoid opening or marking PRs ready for review during that window, or set expectations with reviewers that anything opened then may not be seen until the next day.`,
  ].join(' ');

  const insight: InsightDraft = {
    id: `review-bottlenecks:availability:${worst.bucketKey}`,
    kind: 'bottlenecks',
    severity: 'warning',
    title,
    emphasis,
    body,
    timeWindowLabel: 'Last 4 weeks',
    stats: [
      {
        label: 'Median in that window',
        value: bucketMedianLabel,
      },
      {
        label: 'Overall median',
        value: baselineLabel,
      },
      {
        label: 'First reviews in that window',
        value: String(worst.count),
      },
    ],
    metrics: {
      baselineMedianHours,
      deadzoneMedianHours: worst.medianLatencyHours,
      slowdownRatio: worst.slowdownRatio,
      bucketSampleSize: worst.count,
      totalSamples: samples.length,
      weekdayIndex: worst.weekdayIndex,
      timeBucket: worst.timeBucket,
    },
    meta: {
      categories: ['reviews', 'bottlenecks', 'availability'],
      simulated: false,
    },
  };

  return insight;
}
