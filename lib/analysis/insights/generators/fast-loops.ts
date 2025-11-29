import { InsightContext } from '../types';
import { PullRequest } from '@/lib/db/schema';
import { diffSecondsRounded } from '../../normalizers/helpers';
import { computeMedianClamped } from '@/lib/utils/math';
import { getLocalWeekdayIndex, toLocalDate } from '@/lib/utils/date';
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
import { Insight } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';

type FastLoopCandidate = PullRequest & {
  cycleTimeHours: number;
  sizeBucket: SizeBucket;
  timeOfDay: TimeOfDayBucket;
  dayBucket: DayBucket;
  cleanPass: boolean;
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

function pickDominantBucket<T extends string>(
  counts: BucketCount<T>[],
  total: number,
  minShare = 0.5,
  minCount = 3
): BucketCount<T> | null {
  if (!counts.length || total === 0) return null;
  const sorted = [...counts].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  const share = top.count / total;
  if (top.count < minCount) return null;
  if (share < minShare) return null;
  return top;
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
      const cleanPass = (pr.blockingReviewCount ?? 0) === 0;

      return {
        ...pr,
        cycleTimeHours,
        sizeBucket,
        timeOfDay,
        dayBucket,
        cleanPass,
      };
    })
    .filter((c) => c.cycleTimeHours > 0 && c.cycleTimeHours < MAX_HOURS_CUTOFF);

  if (candidates.length < 5) return null;

  // 2) Baseline median cycle time
  const baselineMedianHours = computeMedianClamped(
    candidates.map((c) => c.cycleTimeHours),
    { min: 0, max: MAX_HOURS_CUTOFF }
  );
  if (baselineMedianHours <= 0) return null;

  // 3) Define “fast” as <= 85% of median, but at least 2h faster
  const maxFastHours = Math.max(2, baselineMedianHours * 0.85);
  const fast = candidates.filter((c) => c.cycleTimeHours <= maxFastHours);

  if (fast.length < 4) return null;

  const fastMedianHours = computeMedianClamped(
    fast.map((c) => c.cycleTimeHours),
    { min: 0, max: MAX_HOURS_CUTOFF }
  );
  if (fastMedianHours <= 0) return null;

  // 4) Look for a dominant pattern inside fast PRs
  const totalFast = fast.length;

  const timeOfDayBuckets = bucketCounts(fast, (c) => c.timeOfDay);
  const sizeBuckets = bucketCounts(fast, (c) => c.sizeBucket);
  const dayBuckets = bucketCounts(fast, (c) => c.dayBucket);
  const cleanPassBuckets = bucketCounts(fast, (c) =>
    c.cleanPass ? 'clean' : 'non_clean'
  );

  const topTimeOfDay = pickDominantBucket(timeOfDayBuckets, totalFast, 0.45, 3);
  const topSize = pickDominantBucket(sizeBuckets, totalFast, 0.45, 3);
  const topDay = pickDominantBucket(dayBuckets, totalFast, 0.45, 3);
  const topCleanPass = pickDominantBucket(cleanPassBuckets, totalFast, 0.55, 4);

  // 5) Choose the most narratively useful pattern
  type PatternKind = 'size+time' | 'time' | 'day' | 'clean';
  let patternKind: PatternKind | null = null;

  if (topSize && topTimeOfDay) {
    patternKind = 'size+time';
  } else if (topTimeOfDay) {
    patternKind = 'time';
  } else if (topDay) {
    patternKind = 'day';
  } else if (topCleanPass) {
    patternKind = 'clean';
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
  } else if (patternKind === 'clean' && topCleanPass) {
    patternDescription = 'PRs that are approved on the first review';
    emphasis = 'first-pass approvals correlate with fast merges';
    title = 'Clean-pass PRs are your fastest loops';
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
    timeframeLabel: 'last 4 weeks',
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

  const insight: Insight = {
    id: 'fast-loops:baseline',
    kind: 'fast_loops',
    severity: 'positive',
    title,
    emphasis,
    body,
    timeWindowLabel: 'Last 4 weeks',
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
    // metrics: {
    //   baselineMedianHours,
    //   fastMedianHours,
    //   sampleSize: fast.length,
    //   totalPrCount: candidates.length,
    // },
    meta: {
      patternKind,
      topTimeOfDay: topTimeOfDay?.key ?? null,
      topSize: topSize?.key ?? null,
      topDay: topDay?.key ?? null,
      topCleanPassShare: topCleanPass ? topCleanPass.count / totalFast : null,
    },
    score,
  };

  return insight;
}
