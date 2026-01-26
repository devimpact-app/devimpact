import { computeMedianClamped } from '@/lib/utils/math';
import { InsightContext } from '../types';
import { Insight, InsightRelatedItem } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';
import { MAX_HOURS_CUTOFF } from './shared';
import { formatRangeServer } from '@/lib/utils/server-date';
import { formatHours } from '@/lib/utils/date';

const THRESHOLD_MIN_MERGED_PRS = 4;

type FingerprintStats = {
  medianLinesChanged: number | null;
  medianFilesChanged: number | null;
  medianLeadTimeHours: number | null;
  medianTimeToFirstReviewHours: number | null;
  medianReviewRounds: number | null;
  testTouchRate: number | null; // 0–1
  sampleCount: number;
};

function computeFingerprintStats(ctx: InsightContext): FingerprintStats | null {
  const { authoredPrs } = ctx;
  if (!authoredPrs || authoredPrs.length === 0) return null;

  const merged = authoredPrs.filter((pr) => !!pr.mergedAt);

  if (merged.length < THRESHOLD_MIN_MERGED_PRS) {
    return null;
  }

  const linesChanged = merged.map((pr) => pr.linesChanged ?? 0);
  const filesChanged = merged.map((pr) => pr.filesChanged ?? 0);

  const leadTimeHours = merged
    .map((pr) =>
      pr.leadTimeSeconds && pr.leadTimeSeconds > 0
        ? pr.leadTimeSeconds / 3600
        : null
    )
    .filter((h): h is number => h !== null && h > 0 && h <= MAX_HOURS_CUTOFF);

  const timeToFirstReviewHours = merged
    .map((pr) =>
      pr.timeToFirstReviewSeconds && pr.timeToFirstReviewSeconds > 0
        ? pr.timeToFirstReviewSeconds / 3600
        : null
    )
    .filter((h): h is number => h !== null && h > 0 && h <= MAX_HOURS_CUTOFF);

  const reviewRounds = merged
    .map((pr) => ((pr.reviewRounds ?? 0) > 0 ? pr.reviewRounds! : null))
    .filter((v): v is number => v !== null);

  const testTouchMatches = merged.filter((pr) => {
    const touchedTests = pr.touchedTests ?? false;
    const testFilesChanged = (pr.testFilesChanged ?? 0) > 0;
    return touchedTests || testFilesChanged;
  });

  const medianLinesChanged =
    linesChanged.length > 0
      ? computeMedianClamped(linesChanged, { min: 0, max: 50000 })
      : null;

  const medianFilesChanged =
    filesChanged.length > 0
      ? computeMedianClamped(filesChanged, { min: 0, max: 500 })
      : null;

  const medianLeadTimeHours =
    leadTimeHours.length > 0
      ? computeMedianClamped(leadTimeHours, {
          min: 0,
          max: MAX_HOURS_CUTOFF,
        })
      : null;

  const medianTimeToFirstReviewHours =
    timeToFirstReviewHours.length > 0
      ? computeMedianClamped(timeToFirstReviewHours, {
          min: 0,
          max: MAX_HOURS_CUTOFF,
        })
      : null;

  const medianReviewRoundsVal =
    reviewRounds.length > 0
      ? computeMedianClamped(reviewRounds, { min: 0, max: 20 })
      : null;

  const testTouchRate =
    merged.length > 0 ? testTouchMatches.length / merged.length : null;

  return {
    medianLinesChanged,
    medianFilesChanged,
    medianLeadTimeHours,
    medianTimeToFirstReviewHours,
    medianReviewRounds: medianReviewRoundsVal,
    testTouchRate,
    sampleCount: merged.length,
  };
}

function describePrSize(medianLines: number | null): string {
  if (medianLines == null) return 'medium-sized';
  if (medianLines <= 80) return 'small';
  if (medianLines <= 250) return 'medium-sized';
  return 'large';
}

function describeLeadTime(medianHours: number | null): string {
  if (medianHours == null) return 'steady to ship';
  if (medianHours <= 12) return 'fast to ship';
  if (medianHours <= 36) return 'steady to ship';
  return 'slow to ship';
}

function formatPercent(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

function pickRepresentativePrs(
  ctx: InsightContext,
  medianLinesChanged: number | null
): InsightRelatedItem[] {
  const { authoredPrs } = ctx;
  if (!authoredPrs || authoredPrs.length === 0 || medianLinesChanged == null) {
    return [];
  }

  const merged = authoredPrs.filter((pr) => !!pr.mergedAt);
  if (merged.length === 0) return [];

  const scored = merged
    .map((pr) => {
      const lines = pr.linesChanged ?? 0;
      const diff = Math.abs(lines - medianLinesChanged);
      return { pr, diff };
    })
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 5);

  return scored.map(({ pr }) => {
    const leadTimeHours =
      pr.leadTimeSeconds && pr.leadTimeSeconds > 0
        ? pr.leadTimeSeconds / 3600
        : null;

    return {
      entityType: 'pull_request' as const,
      id: pr.id,
      title: pr.title || `PR #${pr.prNumber}`,
      subtitle: pr.repoFullName
        ? `${pr.repoFullName} · #${pr.prNumber}`
        : `PR #${pr.prNumber}`,
      htmlUrl: pr.htmlUrl,
      stats: [
        {
          label: 'Lines changed',
          value: (pr.linesChanged ?? 0).toString(),
        },
        {
          label: 'Files changed',
          value: (pr.filesChanged ?? 0).toString(),
        },
        {
          label: 'Lead time',
          value: formatHours(leadTimeHours),
        },
      ],
      meta: {
        prNumber: pr.prNumber,
        repoFullName: pr.repoFullName,
        htmlUrl: pr.htmlUrl,
      },
    };
  });
}

export function generatePullRequestFingerprintInsight(
  ctx: InsightContext
): Insight | null {
  const stats = computeFingerprintStats(ctx);
  if (!stats) return null;

  const {
    medianLinesChanged,
    medianFilesChanged,
    medianLeadTimeHours,
    medianTimeToFirstReviewHours,
    medianReviewRounds,
    testTouchRate,
    sampleCount,
  } = stats;

  // Simple descriptors for title/emphasis
  const sizeLabel = describePrSize(medianLinesChanged);
  const speedLabel = describeLeadTime(medianLeadTimeHours);

  const medianLinesLabel =
    medianLinesChanged !== null
      ? `${Math.round(medianLinesChanged)} lines`
      : '—';
  const medianFilesLabel =
    medianFilesChanged !== null
      ? `${Math.round(medianFilesChanged)} files`
      : '—';
  const leadTimeLabel = formatHours(medianLeadTimeHours);
  const firstReviewLabel = formatHours(medianTimeToFirstReviewHours);
  const reviewRoundsLabel =
    medianReviewRounds !== null
      ? `${medianReviewRounds.toFixed(1)} rounds`
      : '—';
  const testRateLabel = formatPercent(testTouchRate);

  const title = `Your typical PR is ${sizeLabel} and ${speedLabel}`;
  const emphasis = `${medianLinesLabel}, ${medianFilesLabel}, ~${leadTimeLabel} from first commit to merge`;

  const primaryStats = [
    {
      label: 'Median lines changed',
      value: medianLinesLabel,
      importance: 'primary' as const,
    },
    {
      label: 'Median files changed',
      value: medianFilesLabel,
      importance: 'primary' as const,
    },
    {
      label: 'Median lead time',
      value: leadTimeLabel,
      importance: 'primary' as const,
    },
  ];

  const secondaryStats = [
    {
      label: 'Median time to first review',
      value: firstReviewLabel,
      importance: 'secondary' as const,
    },
    {
      label: 'Median review rounds',
      value: reviewRoundsLabel,
      importance: 'secondary' as const,
    },
    {
      label: 'PRs touching tests',
      value: testRateLabel,
      importance: 'secondary' as const,
    },
    {
      label: 'Merged PRs in this window',
      value: String(sampleCount),
      importance: 'secondary' as const,
    },
  ];

  // Scoring: this is an "always-on" descriptive insight, so keep mid–high but stable
  const signalStrength = 2; // there's always a signal as long as we have enough PRs
  const recurrence = 5; // always applicable to your work
  const impact = 2; // informational, not a direct bottleneck
  const novelty = 2; // useful framing, but not a rare event
  const personalization = 5; // tightly tailored to your own PRs

  const score = scoreInsightBase({
    signalStrength,
    recurrence,
    impact,
    novelty,
    personalization,
  });

  const relatedItems = pickRepresentativePrs(ctx, medianLinesChanged);

  const insight: Insight = {
    id: 'shipping_profile:recent',
    kind: 'fast_loops',
    severity: 'info',
    title,
    emphasis,
    body: [
      `Looking at your merged PRs in this recent window, we computed a “fingerprint” of what your typical change looks like.`,
      `This isn’t a judgment of good or bad — it’s a baseline that helps put other insights, like bottlenecks or review friction, into context.`,
    ].join(' '),
    timeWindowLabel: formatRangeServer(
      ctx.windowStart,
      ctx.windowEnd,
      ctx.timezone
    ),
    stats: [...primaryStats, ...secondaryStats],
    score,
    relatedItems,
    // transparency: {
    //   summary:
    //     'This profile summarizes medians and simple ratios across your merged PRs in the recent window — no LLM, just straightforward aggregations.',
    //   bullets: [
    //     `We only include PRs that were merged in this window (minimum ${THRESHOLD_MIN_MERGED_PRS} to show this insight).`,
    //     `Typical size is based on median lines and files changed across those PRs.`,
    //     `Timing stats like lead time and time to first review ignore outliers above ${MAX_HOURS_CUTOFF}h.`,
    //     `The test touch rate is the share of merged PRs that modified test files or were marked as touching tests.`,
    //   ],
    //   thresholds: [
    //     {
    //       key: 'minMergedPrs',
    //       label: 'Minimum merged PRs to compute a fingerprint',
    //       actual: sampleCount,
    //       condition: `>= ${THRESHOLD_MIN_MERGED_PRS}`,
    //     },
    //     {
    //       key: 'leadTimeCutoffHours',
    //       label: 'Max hours included when computing timing medians',
    //       actual: MAX_HOURS_CUTOFF,
    //       condition: `<= ${MAX_HOURS_CUTOFF}h`,
    //     },
    //   ],
    // },
  };

  return insight;
}
