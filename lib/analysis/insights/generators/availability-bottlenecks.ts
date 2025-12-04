import { computeMedianClamped } from '@/lib/utils/math';
import { InsightContext } from '../types';
import {
  formatTimeOfDayLabel,
  formatWeekdayLabel,
  getTimeOfDayBucket,
  MAX_HOURS_CUTOFF,
  TimeOfDayBucket,
} from './shared';
import {
  formatRangeServer,
  getWeekdayServer,
  toLocalDateServer,
} from '@/lib/utils/server-date';
import { Insight } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';
import { PullRequest } from '@/lib/db/schema';

// Thresholds
const THRESHOLD_MIN_AUTHORED_PRS = 8;
const THRESHOLD_MIN_TIME_OF_WEEK_BUCKET = 3;
const THRESHOLD_MIN_SLOWER_PERCENTAGE = 40;
const THRESHOLD_MIN_SLOWER_HOURS = 3;

type BucketStats = {
  bucketKey: string;
  weekdayIndex: number;
  timeBucket: TimeOfDayBucket;
  count: number;
  medianLatencyHours: number;
  slowdownRatio: number;
  absoluteDiff: number;
};

type Sample = {
  pr: PullRequest;
  bucketKey: string; // `${weekday}:${timeBucket}`
  weekdayIndex: number; // 0–6 local
  timeBucket: TimeOfDayBucket;
  latencyHours: number;
};

export function generateAvailabilityDeadzoneInsight(
  ctx: InsightContext
): Insight | null {
  const { authoredPrs, timezone } = ctx;
  if (!authoredPrs) return null;

  const samples: Sample[] = [];

  for (const pr of authoredPrs) {
    if (!pr || !pr.timeToFirstReviewSeconds || !pr.lastReadyForReviewAt)
      continue;

    const seconds = pr.timeToFirstReviewSeconds ?? 0;
    if (seconds <= 0) continue;

    const hours = seconds / 3600;
    if (hours <= 0 || hours > MAX_HOURS_CUTOFF) continue;

    const readyLocal = toLocalDateServer(pr.lastReadyForReviewAt, timezone);
    const weekdayIdx = getWeekdayServer(pr.lastReadyForReviewAt, timezone); // 0–6 in that tz
    const timeBucket = getTimeOfDayBucket(readyLocal.getHours());
    const bucketKey = `${weekdayIdx}:${timeBucket}`;

    samples.push({
      pr,
      bucketKey,
      weekdayIndex: weekdayIdx,
      timeBucket,
      latencyHours: hours,
    });
  }

  if (samples.length < THRESHOLD_MIN_AUTHORED_PRS) {
    // not enough signal to do time-of-week analysis
    return null;
  }

  const baselineMedianHours = computeMedianClamped(
    samples.map((s) => s.latencyHours),
    { min: 0, max: MAX_HOURS_CUTOFF }
  );
  if (baselineMedianHours <= 0) return null;

  const latenciesByBucket = new Map<string, Sample[]>();
  for (const s of samples) {
    const arr = latenciesByBucket.get(s.bucketKey) ?? [];
    arr.push(s);
    latenciesByBucket.set(s.bucketKey, arr);
  }

  const bucketStats: BucketStats[] = [];
  for (const [key, bucketSamples] of latenciesByBucket.entries()) {
    if (bucketSamples.length < THRESHOLD_MIN_TIME_OF_WEEK_BUCKET) continue; // min sample per bucket

    const medianLatencyHours = computeMedianClamped(
      bucketSamples.map((s) => s.latencyHours),
      { min: 0, max: MAX_HOURS_CUTOFF }
    );
    if (medianLatencyHours <= 0) continue;

    const slowdownRatio =
      baselineMedianHours > 0 ? medianLatencyHours / baselineMedianHours : 1;
    const absoluteDiff = medianLatencyHours - baselineMedianHours;

    const isDeadZone =
      slowdownRatio >= 1 + THRESHOLD_MIN_SLOWER_PERCENTAGE / 100 &&
      absoluteDiff >= THRESHOLD_MIN_SLOWER_HOURS;
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
  const timeframeLabel = 'Recent window';

  // Simple scoring heuristic for v0 ---
  const shareOfSamples = worst.count / samples.length;
  const slowdownRatio = worst.slowdownRatio;
  const absoluteDiff = worst.absoluteDiff;

  // signalStrength: how bad this dead zone is (ratio + absolute diff)
  let signalStrength = 2;
  if (slowdownRatio >= 2 && absoluteDiff >= 8) {
    signalStrength = 5;
  } else if (slowdownRatio >= 1.7 && absoluteDiff >= 4) {
    signalStrength = 4;
  } else if (slowdownRatio >= 1.4 && absoluteDiff >= 2) {
    signalStrength = 3;
  }

  // recurrence: how often you hit this window for first reviews
  let recurrence = 2;
  if (worst.count >= 10 && shareOfSamples >= 0.3) {
    recurrence = 5;
  } else if (worst.count >= 6 && shareOfSamples >= 0.2) {
    recurrence = 4;
  } else if (worst.count >= 3 && shareOfSamples >= 0.15) {
    recurrence = 3;
  }

  // impact: extra hours of waiting
  let impact = 2;
  if (absoluteDiff >= 8) impact = 5;
  else if (absoluteDiff >= 4) impact = 4;
  else if (absoluteDiff >= 2) impact = 3;

  const novelty = 3; // “this specific time window is bad”
  const personalization = 4; // based on *your* actual review timing

  const score = scoreInsightBase({
    signalStrength,
    recurrence,
    impact,
    novelty,
    personalization,
  });

  const title = `You hit a review dead zone on ${dayLabel.toLowerCase()} ${timeLabel}`;
  const emphasis = `${bucketMedianLabel} median first review vs ${baselineLabel} overall`;

  const body = [
    `Over the period, PRs you sent for review on ${dayLabel.toLowerCase()} ${timeLabel} waited much longer for a first review.`,
    `Median time to first review in that window was ${bucketMedianLabel}, about ${slowdownPct}% slower than your overall median of ${baselineLabel}.`,
    `When it’s possible, avoid opening or marking PRs ready for review during that window, or set expectations with reviewers that anything opened then may not be seen until the next day.`,
  ].join(' ');

  const worstBucketSamples = (latenciesByBucket.get(worst.bucketKey) ?? [])
    .slice()
    .sort((a, b) => b.latencyHours - a.latencyHours)
    .slice(0, 8); // cap for v0

  const relatedItems: Insight['relatedItems'] = worstBucketSamples.map((s) => {
    const pr = s.pr;
    const readyLocal = pr.lastReadyForReviewAt
      ? toLocalDateServer(pr.lastReadyForReviewAt, timezone)
      : null;
    const readyDateLabel = readyLocal
      ? readyLocal.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: timezone,
        })
      : null;
    const timeBucketLabel = formatTimeOfDayLabel(s.timeBucket);
    return {
      id: pr.id,
      entityType: 'pull_request',
      title: pr.title || `PR #${pr.prNumber ?? ''}`,
      htmlUrl: pr.htmlUrl ?? undefined,
      subtitle:
        pr.repoFullName && pr.prNumber
          ? `${pr.repoFullName} · #${pr.prNumber}`
          : (pr.repoFullName ?? undefined),
      stats: [
        {
          label: 'Time to first review',
          value: `${s.latencyHours.toFixed(1)}h`,
          importance: 'primary',
        },
        ...(readyDateLabel
          ? [
              {
                label: 'Ready at',
                value: `${readyDateLabel} (${timeBucketLabel})`,
                importance: 'secondary',
              } as const,
            ]
          : []),
      ],
      meta: {
        latencyHours: s.latencyHours,
        weekdayIndex: s.weekdayIndex,
        timeBucket: s.timeBucket,
        bucketKey: s.bucketKey,
      },
    };
  });

  const insight: Insight = {
    id: `review-bottlenecks:availability:${worst.bucketKey}`,
    kind: 'bottlenecks',
    severity: 'warning',
    title,
    emphasis,
    body,
    timeWindowLabel: formatRangeServer(
      ctx.windowStart,
      ctx.windowEnd,
      timezone
    ),
    stats: [
      {
        label: 'Median in that window',
        value: bucketMedianLabel,
        importance: 'primary',
      },
      {
        label: 'Overall median',
        value: baselineLabel,
        importance: 'primary',
      },
      {
        label: 'First reviews in that window',
        value: String(worst.count),
        importance: 'primary',
      },
      {
        label: 'Slowdown percent',
        value: `${slowdownPct}%`,
        importance: 'secondary',
      },
    ],
    score,
    relatedItems,
    transparency: {
      summary: `This window was flagged because PRs sent for review then had significantly slower first-review times than your baseline.`,
      bullets: [
        `We compared the median first-review time across all your PRs to the median in each time-of-week bucket.`,
        `A bucket is considered a "dead zone" when it is both slower by ≥${THRESHOLD_MIN_SLOWER_PERCENTAGE}% and at least +${THRESHOLD_MIN_SLOWER_HOURS}h slower in absolute terms.`,
        `We also require ≥${THRESHOLD_MIN_TIME_OF_WEEK_BUCKET} PRs in that window to avoid noise.`,
      ],
      thresholds: [
        {
          key: 'slowdownRatio',
          label: 'Slowdown ratio',
          actual: worst.slowdownRatio,
          condition: `>= 1 + ${THRESHOLD_MIN_SLOWER_PERCENTAGE / 100}`,
        },
        {
          key: 'absoluteDiff',
          label: 'Extra hours waited',
          actual: worst.absoluteDiff,
          condition: `>= ${THRESHOLD_MIN_SLOWER_HOURS}h`,
        },
        {
          key: 'sampleCount',
          label: 'PRs in this window',
          actual: worst.count,
          condition: `>= ${THRESHOLD_MIN_TIME_OF_WEEK_BUCKET}`,
        },
      ],
    },
  };

  return insight;
}
