import { InsightContext, InsightDraft } from '../types';
import { PullRequest } from '@/lib/db/schema';
import { diffSecondsRounded } from '../../normalizers/helpers';
import { computeMedianClamped } from '@/lib/utils/math';
import { getLocalWeekdayIndex, toLocalDate } from '@/lib/utils/date';

export type TimeOfDayBucket =
  | 'early_morning'
  | 'morning'
  | 'afternoon'
  | 'evening';

export type DayBucket =
  | 'early_week' // Mon–Tue
  | 'mid_week' // Wed–Thu
  | 'late_week' // Fri
  | 'weekend'; // Sat–Sun

export type SizeBucket = 'tiny' | 'small' | 'medium' | 'large';

export type FastLoopCandidate = PullRequest & {
  cycleTimeHours: number;

  /** Derived size classification based on lines/files changed */
  sizeBucket: SizeBucket;

  /** Local time-of-day when it became ready for review */
  timeOfDay: TimeOfDayBucket;

  /** Local day-of-week bucket */
  dayBucket: DayBucket;

  /** True if no changes were requested on this PR */
  cleanPass: boolean;

  /** True if there was heavy review discussion */
  highDiscussion: boolean;
};

export type FastLoopSegment = {
  /** Stable machine ID for this segment definition */
  id: string;

  /** Human-friendly label, e.g. "small morning PRs" */
  label: string;

  /** Hint to help build narrative text */
  descriptionHint: string;

  /** How many PRs fit this segment */
  sampleSize: number;

  /** Median cycle time *within* this segment (in hours) */
  fastMedianHours: number;

  /** Median cycle time across *all* PRs in the window (in hours) */
  baselineMedianHours: number;

  /* e.g. baseline=20h, segment=10h → 2.0x faster */
  improvementRatio: number;
  meta?: Record<string, unknown>;
};

type SegmentDef = {
  id: string;
  label: string; // human name: "small morning PRs"
  descriptionHint: string; // used in body copy
  matches: (c: FastLoopCandidate) => boolean;
};

const segmentsToEvaluate: SegmentDef[] = [
  {
    id: 'small-morning',
    label: 'small morning PRs',
    descriptionHint:
      'PRs that became ready for review in the morning and stayed relatively small in scope.',
    matches: (c) =>
      (c.sizeBucket === 'tiny' || c.sizeBucket === 'small') &&
      c.timeOfDay === 'morning',
  },
  {
    id: 'small-early-week',
    label: 'small early-week PRs',
    descriptionHint: 'Small PRs you get ready early in the week (Mon–Tue).',
    matches: (c) =>
      (c.sizeBucket === 'tiny' || c.sizeBucket === 'small') &&
      c.dayBucket === 'early_week',
  },
  {
    id: 'clean-pass',
    label: 'clean-pass PRs',
    descriptionHint: 'PRs that were approved without changes requested.',
    matches: (c) => c.cleanPass === true,
  },
  {
    id: 'small-low-discussion',
    label: 'small PRs with light discussion',
    descriptionHint:
      'Compact PRs that didn’t require heavy back-and-forth in review.',
    matches: (c) =>
      (c.sizeBucket === 'tiny' || c.sizeBucket === 'small') &&
      !c.highDiscussion,
  },
];

function getTimeOfDayBucket(hour: number): TimeOfDayBucket {
  if (hour < 8) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getDayBucket(localWeekdayIndex: number): DayBucket {
  if (localWeekdayIndex <= 1) return 'early_week'; // Mon–Tue
  if (localWeekdayIndex <= 3) return 'mid_week'; // Wed–Thu
  if (localWeekdayIndex === 4) return 'late_week'; // Fri
  return 'weekend'; // Sat–Sun
}

function getSizeBucket(
  linesChanged: number | null | undefined,
  filesChanged: number | null | undefined
): SizeBucket {
  const lines = linesChanged ?? 0;
  const files = filesChanged ?? 0;

  if (lines <= 50 && files <= 2) return 'tiny';
  if (lines <= 250 && files <= 6) return 'small';
  if (lines <= 800 && files <= 15) return 'medium';
  return 'large';
}

function formatFastLoopsBody(params: {
  segmentLabel: string;
  descriptionHint: string;
  baselineMedianHours: number;
  segmentMedianHours: number;
  pctImprovement: number; // 0–1
  sampleSize: number;
  timeframeLabel: string; // e.g. 'last 4 weeks'
}): string {
  const {
    segmentLabel,
    descriptionHint,
    baselineMedianHours,
    segmentMedianHours,
    pctImprovement,
    sampleSize,
    timeframeLabel,
  } = params;

  const baselineStr = baselineMedianHours.toFixed(1);
  const segmentStr = segmentMedianHours.toFixed(1);
  const pct = Math.round(pctImprovement * 100);

  const firstSentence = `Over the ${timeframeLabel}, your ${segmentLabel} merged about ${pct}% faster than your typical PR (${segmentStr}h vs ${baselineStr}h).`;

  let secondSentence = '';
  if (sampleSize >= 10) {
    secondSentence = ` This pattern showed up consistently (${sampleSize} PRs), not just as a one-off.`;
  } else if (sampleSize >= 5) {
    secondSentence = ` This is based on ${sampleSize} PRs, so it’s a real pattern but still worth watching over time.`;
  }

  const thirdSentence = descriptionHint ? ` ${descriptionHint}` : '';

  return `${firstSentence}${secondSentence}${thirdSentence}`;
}

export function generateFastLoopsInsight(
  ctx: InsightContext
): InsightDraft | null {
  const { authoredPrs, timezone } = ctx;

  const candidates: FastLoopCandidate[] = authoredPrs
    .filter((pr) => pr.lastReadyForReviewAt && pr.mergedAt)
    .map((pr) => {
      console.log('lastReadyForReviewAt', pr.lastReadyForReviewAt);
      console.log('mergedAt', pr.mergedAt);
      const cycleTimeSeconds = diffSecondsRounded(
        pr.lastReadyForReviewAt,
        pr.mergedAt
      );
      console.log('cycleTimeSeconds', cycleTimeSeconds);
      const safeSeconds =
        typeof cycleTimeSeconds === 'number' && cycleTimeSeconds > 0
          ? cycleTimeSeconds
          : 0;
      const cycleTimeHours = safeSeconds / 3600;
      console.log('cycleTimeHours', cycleTimeHours);

      const readyLocal = toLocalDate(pr.lastReadyForReviewAt!, timezone);
      const hour = readyLocal.getHours();
      const weekdayIdx = getLocalWeekdayIndex(
        pr.lastReadyForReviewAt!,
        timezone
      );
      const sizeBucket = getSizeBucket(pr.linesChanged, pr.filesChanged);
      const timeOfDay = getTimeOfDayBucket(hour);
      const dayBucket = getDayBucket(weekdayIdx);
      const cleanPass = (pr.changesRequestedCount ?? 0) === 0;
      const highDiscussion = (pr.reviewCommentsCount ?? 0) >= 10; // tweak threshold later
      return {
        ...pr,
        cycleTimeHours,
        sizeBucket,
        timeOfDay,
        dayBucket,
        cleanPass,
        highDiscussion,
      };
    });

  console.log('candidates', candidates.length);

  // If there isn't enough data, don't surface an insight at all.
  if (candidates.length < 5) {
    return null;
  }

  // Get baseline so we can see deviations from normal cycle
  const baselineMedianHours = computeMedianClamped(
    candidates.map((c) => c.cycleTimeHours),
    { min: 0, max: 24 * 14 } // 14 days in hours
  );

  console.log('baselineMedianHours', baselineMedianHours);

  // If baseline is already extremely fast (e.g. < 2h), skip for now
  if (baselineMedianHours < 2) return null;

  // Go through segments, see if pass threshold
  const viableSegments: FastLoopSegment[] = [];
  for (const segmentDef of segmentsToEvaluate) {
    const inSegment = candidates.filter(segmentDef.matches);
    if (inSegment.length < 5) continue; // min sample size

    console.log('inSegment', inSegment.length, segmentDef.id);
    const fastMedianHours = computeMedianClamped(
      inSegment.map((c) => c.cycleTimeHours),
      { min: 0, max: 24 * 14 }
    );
    console.log('fastMedianHours', fastMedianHours);

    if (fastMedianHours <= 0) continue;

    const improvementRatio =
      baselineMedianHours > 0 ? baselineMedianHours / fastMedianHours : 1;

    // require at least ~30–40% faster and maybe >= 2h absolute difference
    const absoluteDiff = baselineMedianHours - fastMedianHours;
    const passesThresholds = improvementRatio >= 1.3 && absoluteDiff >= 2;

    if (!passesThresholds) continue;

    viableSegments.push({
      id: segmentDef.id,
      label: segmentDef.label,
      descriptionHint: segmentDef.descriptionHint,
      sampleSize: inSegment.length,
      fastMedianHours,
      baselineMedianHours,
      improvementRatio,
    });
  }

  if (viableSegments.length === 0) {
    return null;
  }

  viableSegments.sort((a, b) => {
    // higher improvement first, then larger sample
    if (b.improvementRatio !== a.improvementRatio) {
      return b.improvementRatio - a.improvementRatio;
    }
    return b.sampleSize - a.sampleSize;
  });
  const best = viableSegments[0];
  const improvementDisplay = best.improvementRatio.toFixed(1); // e.g. "2.3×"
  const fastMedianLabel = `${best.fastMedianHours.toFixed(1)}h`;
  const baselineLabel = `${best.baselineMedianHours.toFixed(1)}h`;

  const pctImprovement =
    baselineMedianHours > 0
      ? (baselineMedianHours - best.fastMedianHours) / baselineMedianHours
      : 0;

  const body = formatFastLoopsBody({
    segmentLabel: best.label,
    descriptionHint: best.descriptionHint,
    baselineMedianHours,
    segmentMedianHours: best.fastMedianHours,
    pctImprovement,
    sampleSize: best.sampleSize,
    timeframeLabel: 'last 4 weeks',
  });

  const insight: InsightDraft = {
    id: `fast-loops:${best.id}`,
    kind: 'fast_loops',
    severity: 'positive',
    title: `Your ${best.label} merged ${improvementDisplay}× faster`,
    emphasis: `${improvementDisplay}x faster turnaround`,
    body,
    timeWindowLabel: 'Last 4 weeks',
    stats: [
      {
        label: 'PRs in this pattern',
        value: String(best.sampleSize),
      },
      {
        label: 'Pattern median',
        value: fastMedianLabel,
      },
      {
        label: 'Overall median',
        value: baselineLabel,
      },
    ],
    metrics: {
      baselineMedianHours,
      fastMedianHours: best.fastMedianHours,
      sampleSize: best.sampleSize,
      totalPrCount: candidates.length,
    },
    meta: {
      simulated: false,
      topThemes: ['fast-loops', 'reviews', 'patterns'],
    },
  };

  return insight;
}
