import { InsightContext } from '../types';
import { PullRequest } from '@/lib/db/schema';
import { diffSecondsRounded } from '../../normalizers/helpers';
import { computeMedianClamped } from '@/lib/utils/math';
import {
  formatRange,
  getLocalWeekdayIndex,
  toLocalDate,
} from '@/lib/utils/date';
import {
  DayBucket,
  formatDayBucketLabel,
  formatSizeLabel,
  formatTimeOfDayLabel,
  getDayBucket,
  getSizeBucket,
  getTimeOfDayBucket,
  MAX_HOURS_CUTOFF,
  SizeBucket,
  TimeOfDayBucket,
} from './shared';
import { Insight, InsightRelatedItem } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';

const THRESHOLD_MIN_AUTHORED_PRS = 5;
const THRESOLD_MAX_MEDIAN_RATIO = 0.85;
const THRESHOLD_MIN_FAST_PRS = 4;
const THRESOLD_MIN_SHARE_FOR_SIZE_OR_TIME = 0.45;
const THRESHOLD_MIN_COUNT_FOR_SIZE_OR_TIME = 3;
const THRESHOLD_MIN_SIZE_ENRICHMENT = 0.15;

type FastLoopCandidate = PullRequest & {
  cycleTimeHours: number;
  sizeBucket: SizeBucket;
  timeOfDay: TimeOfDayBucket;
  dayBucket: DayBucket;
};

type BucketCount<T extends string> = {
  key: T;
  count: number;
};

function bucketCounts<T extends string>(
  items: FastLoopCandidate[],
  picker: (c: FastLoopCandidate) => T
): BucketCount<T>[] {
  const m = new Map<T, number>();
  for (const c of items) {
    const key = picker(c);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return Array.from(m.entries()).map(([key, count]) => ({ key, count }));
}

type EnrichedBucket<T extends string> = BucketCount<T> & {
  fastShare: number;
  overallShare: number;
  enrichment: number;
};

function pickEnrichedDominantBucket<T extends string>(params: {
  all: FastLoopCandidate[];
  fast: FastLoopCandidate[];
  pickKey: (c: FastLoopCandidate) => T;
  minFastCount: number;
  minFastShare: number;
  minEnrichment: number;
}): EnrichedBucket<T> | null {
  const { all, fast, pickKey, minFastCount, minFastShare, minEnrichment } =
    params;

  if (!fast.length || !all.length) return null;

  const allBuckets = bucketCounts(all, pickKey);
  const fastBuckets = bucketCounts(fast, pickKey);

  const overallShare = new Map<T, number>();
  for (const b of allBuckets) {
    overallShare.set(b.key, b.count / all.length);
  }

  const enriched: EnrichedBucket<T>[] = [];

  for (const fb of fastBuckets) {
    const fastShare = fb.count / fast.length;
    const baseShare = overallShare.get(fb.key) ?? 0;
    const enrichment = fastShare - baseShare;

    if (fb.count < minFastCount) continue;
    if (fastShare < minFastShare) continue;
    if (enrichment < minEnrichment) continue;

    enriched.push({
      ...fb,
      fastShare,
      overallShare: baseShare,
      enrichment,
    });
  }

  if (!enriched.length) return null;

  // Pick the most enriched bucket; break ties by fast count
  enriched.sort((a, b) => {
    if (b.enrichment !== a.enrichment) return b.enrichment - a.enrichment;
    return b.count - a.count;
  });

  return enriched[0];
}

function formatFastLoopsBody(params: {
  patternDescription: string; // e.g. "small PRs you send for review in the morning"
  baselineMedianHours: number;
  fastMedianHours: number;
  fastCount: number;
  totalCount: number;
  timeframeLabel: string;
}): string {
  const {
    patternDescription,
    baselineMedianHours,
    fastMedianHours,
    fastCount,
    totalCount,
    timeframeLabel,
  } = params;

  const baselineStr = baselineMedianHours.toFixed(1);
  const fastStr = fastMedianHours.toFixed(1);
  const improvementPct =
    baselineMedianHours > 0
      ? Math.round(
          ((baselineMedianHours - fastMedianHours) / baselineMedianHours) * 100
        )
      : 0;

  const firstSentence = `Over the ${timeframeLabel}, your ${patternDescription} merged about ${improvementPct}% faster than your typical PR (${fastStr}h vs ${baselineStr}h median).`;

  let secondSentence = '';
  if (fastCount >= 10) {
    secondSentence = ` This pattern shows up often (${fastCount} of ${totalCount} merged PRs), so it’s worth deliberately leaning into.`;
  } else if (fastCount >= 5) {
    secondSentence = ` It’s based on ${fastCount} PRs so far — a real signal, but still forming.`;
  }

  const thirdSentence =
    ' Try scheduling more of this kind of work into those windows when you can.';

  return `${firstSentence}${secondSentence}${thirdSentence}`;
}

export function generateFastLoopsInsight(ctx: InsightContext): Insight | null {
  const { authoredPrs, timezone } = ctx;

  const candidates: FastLoopCandidate[] = authoredPrs
    .filter((pr) => pr.lastReadyForReviewAt && pr.mergedAt)
    .map((pr) => {
      const cycleTimeSeconds = diffSecondsRounded(
        pr.lastReadyForReviewAt,
        pr.mergedAt
      );
      const safeSeconds =
        typeof cycleTimeSeconds === 'number' && cycleTimeSeconds > 0
          ? cycleTimeSeconds
          : 0;
      const cycleTimeHours = safeSeconds / 3600;

      const readyLocal = toLocalDate(pr.lastReadyForReviewAt!, timezone);
      const hour = readyLocal.getHours();
      const weekdayIdx = getLocalWeekdayIndex(
        pr.lastReadyForReviewAt!,
        timezone
      );

      const sizeBucket = getSizeBucket(pr.linesChanged, pr.filesChanged);
      const timeOfDay = getTimeOfDayBucket(hour);
      const dayBucket = getDayBucket(weekdayIdx);

      return {
        ...pr,
        cycleTimeHours,
        sizeBucket,
        timeOfDay,
        dayBucket,
      };
    })
    .filter((c) => c.cycleTimeHours > 0 && c.cycleTimeHours < MAX_HOURS_CUTOFF);

  if (candidates.length < THRESHOLD_MIN_AUTHORED_PRS) return null;

  // 2) Baseline median cycle time
  const baselineMedianHours = computeMedianClamped(
    candidates.map((c) => c.cycleTimeHours),
    { min: 0, max: MAX_HOURS_CUTOFF }
  );
  if (baselineMedianHours <= 0) return null;

  const maxFastHours = Math.max(
    2,
    baselineMedianHours * THRESOLD_MAX_MEDIAN_RATIO
  );
  const fast = candidates.filter((c) => c.cycleTimeHours <= maxFastHours);

  const totalFast = fast.length;
  if (totalFast < THRESHOLD_MIN_FAST_PRS) return null;
  const fastMedianHours = computeMedianClamped(
    fast.map((c) => c.cycleTimeHours),
    { min: 0, max: MAX_HOURS_CUTOFF }
  );
  if (fastMedianHours <= 0) return null;

  const topSize = pickEnrichedDominantBucket<SizeBucket>({
    all: candidates,
    fast,
    pickKey: (c) => c.sizeBucket,
    minFastCount: THRESHOLD_MIN_COUNT_FOR_SIZE_OR_TIME,
    minFastShare: THRESOLD_MIN_SHARE_FOR_SIZE_OR_TIME,
    minEnrichment: THRESHOLD_MIN_SIZE_ENRICHMENT,
  });

  // Enriched time-of-day bucket (morning/afternoon/evening/late-night)
  const topTimeOfDay = pickEnrichedDominantBucket<TimeOfDayBucket>({
    all: candidates,
    fast,
    pickKey: (c) => c.timeOfDay,
    minFastCount: THRESHOLD_MIN_COUNT_FOR_SIZE_OR_TIME,
    minFastShare: THRESOLD_MIN_SHARE_FOR_SIZE_OR_TIME,
    minEnrichment: THRESHOLD_MIN_SIZE_ENRICHMENT,
  });

  // Enriched day-of-week bucket (early-week / mid-week / late-week etc.)
  const topDay = pickEnrichedDominantBucket<DayBucket>({
    all: candidates,
    fast,
    pickKey: (c) => c.dayBucket,
    minFastCount: THRESHOLD_MIN_COUNT_FOR_SIZE_OR_TIME,
    minFastShare: THRESOLD_MIN_SHARE_FOR_SIZE_OR_TIME,
    minEnrichment: THRESHOLD_MIN_SIZE_ENRICHMENT,
  });

  type PatternKind = 'size+time' | 'time' | 'day';
  let patternKind: PatternKind | null = null;

  if (topSize && topTimeOfDay) {
    patternKind = 'size+time';
  } else if (topTimeOfDay) {
    patternKind = 'time';
  } else if (topDay) {
    patternKind = 'day';
  }

  if (!patternKind) return null;

  let title: string;
  let emphasis: string;
  let patternDescription: string;

  if (patternKind === 'size+time' && topSize && topTimeOfDay) {
    const sizeLabel = formatSizeLabel(topSize.key);
    const timeLabel = formatTimeOfDayLabel(topTimeOfDay.key);
    patternDescription = `${sizeLabel} you send for review in the ${timeLabel}`;
    emphasis = `${sizeLabel} in the ${timeLabel} move fastest`;
    title = `Your ${sizeLabel} in the ${timeLabel} merge much faster`;
  } else if (patternKind === 'time' && topTimeOfDay) {
    const timeLabel = formatTimeOfDayLabel(topTimeOfDay.key);
    patternDescription = `PRs you send for review in the ${timeLabel}`;
    emphasis = `${timeLabel} are your fastest review window`;
    title = `PRs sent for review in the ${timeLabel} merge faster`;
  } else if (patternKind === 'day' && topDay) {
    const dayLabel = formatDayBucketLabel(topDay.key);
    patternDescription = `PRs you send for review on ${dayLabel}`;
    emphasis = `${dayLabel} are your strongest merge window`;
    title = `PRs reviewed on ${dayLabel} tend to merge faster`;
  } else {
    return null;
  }

  // 6) Build body text
  const body = formatFastLoopsBody({
    patternDescription,
    baselineMedianHours,
    fastMedianHours,
    fastCount: fast.length,
    totalCount: candidates.length,
    timeframeLabel: 'recent period',
  });

  const improvementRatio =
    baselineMedianHours > 0 ? baselineMedianHours / fastMedianHours : 1;
  const improvementDisplay = `${improvementRatio.toFixed(1)}×`;

  // Very simple scoring heuristic for V0
  const fastShare = fast.length / candidates.length;
  const absDelta = baselineMedianHours - fastMedianHours;

  // map improvementRatio → 0–5
  let signalStrength = 2;
  if (improvementRatio >= 1.8 && absDelta >= 8) signalStrength = 5;
  else if (improvementRatio >= 1.5 && absDelta >= 4) signalStrength = 4;
  else if (improvementRatio >= 1.2 && absDelta >= 2) signalStrength = 3;

  // recurrence from fastShare
  let recurrence = 2;
  if (fastShare >= 0.4) recurrence = 5;
  else if (fastShare >= 0.25) recurrence = 4;
  else if (fastShare >= 0.15) recurrence = 3;

  // impact mostly tied to saved hours
  let impact = 2;
  if (absDelta >= 12) impact = 5;
  else if (absDelta >= 6) impact = 4;
  else if (absDelta >= 3) impact = 3;

  const novelty = 3; // baseline for now
  const personalization = 4; // this is fully about your own patterns

  const score = scoreInsightBase({
    signalStrength,
    recurrence,
    impact,
    novelty,
    personalization,
  });

  const relatedItems: InsightRelatedItem[] = fast
    .slice()
    .sort((a, b) => a.cycleTimeHours - b.cycleTimeHours)
    .slice(0, 8)
    .map((pr) => ({
      entityType: 'pull_request' as const,
      id: pr.id,
      title: `#${pr.prNumber} · ${pr.title}`,
      htmlUrl: pr.htmlUrl ?? undefined,
      stats: [
        {
          label: 'Cycle time',
          value: `${pr.cycleTimeHours.toFixed(1)}h`,
        },
        ...(typeof pr.linesChanged === 'number'
          ? [
              {
                label: 'Lines changed',
                value: String(pr.linesChanged),
              },
            ]
          : []),
      ],
      meta: {
        sizeBucket: pr.sizeBucket,
        timeOfDay: pr.timeOfDay,
        dayBucket: pr.dayBucket,
      },
    }));

  const insight: Insight = {
    id: 'fast-loops:baseline',
    kind: 'fast_loops',
    severity: 'positive',
    title,
    emphasis,
    body,
    timeWindowLabel: formatRange(ctx.windowStart, ctx.windowEnd),
    stats: [
      {
        label: 'Fast-loop PRs',
        value: String(fast.length),
        importance: 'primary',
      },
      {
        label: 'Fast-loop median',
        value: `${fastMedianHours.toFixed(1)}h`,
        importance: 'primary',
      },
      {
        label: 'Overall median',
        value: `${baselineMedianHours.toFixed(1)}h`,
        importance: 'primary',
      },
    ],
    score,
    relatedItems,
    transparency: {
      summary:
        'We highlighted this because this pattern of PRs consistently merges faster than your typical PRs in this period.',
      bullets: [
        `Looked at ${candidates.length} merged PRs with a ready-for-review and merge time in the selected time period.`,
        `Computed a baseline median cycle time of ${baselineMedianHours.toFixed(
          1
        )}h from ready-for-review to merge.`,
        `Marked PRs as "fast-loop" when their cycle time was ≤ ${Math.round(
          THRESOLD_MAX_MEDIAN_RATIO * 100
        )}% of that baseline and at least 2 hours faster.`,
        `Required at least ${THRESHOLD_MIN_FAST_PRS} fast-loop PRs and a dominant ${
          patternKind === 'day'
            ? 'day-of-week'
            : patternKind === 'time'
              ? 'time-of-day'
              : 'size + time-of-day'
        } bucket covering at least ${Math.round(
          THRESOLD_MIN_SHARE_FOR_SIZE_OR_TIME * 100
        )}% of fast-loop PRs (with ≥ ${
          THRESHOLD_MIN_COUNT_FOR_SIZE_OR_TIME
        } examples).`,
      ],
      thresholds: [
        {
          key: 'improvementRatio',
          label: 'Fast-loop vs baseline cycle time',
          actual: Number(improvementRatio.toFixed(2)),
          condition: '≥ 1.2× faster than baseline',
        },
        {
          key: 'fastShare',
          label: 'Fast-loop share of merged PRs',
          actual: Number(fastShare.toFixed(2)),
          condition: '≥ 0.15 (15%) of merged PRs in this window',
        },
        {
          key: 'sampleSize',
          label: 'Fast-loop sample size',
          actual: fast.length,
          condition: `≥ ${THRESHOLD_MIN_FAST_PRS} PRs`,
        },
      ],
    },
  };

  return insight;
}
