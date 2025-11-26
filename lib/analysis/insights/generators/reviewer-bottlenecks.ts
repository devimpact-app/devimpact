import { InsightContext, InsightDraft } from '../types';
import { computeMedianClamped } from '@/lib/utils/math';
import { MAX_HOURS_CUTOFF } from './shared';

export function generateReviewerBottleneckInsight(
  ctx: InsightContext
): InsightDraft | null {
  const { authoredPrs, reviewsOnAuthoredPrs } = ctx;

  // Need some minimum data to say anything non-silly
  if (!authoredPrs || authoredPrs.length < 5) return null;
  if (!reviewsOnAuthoredPrs || reviewsOnAuthoredPrs.length < 5) return null;

  // 1) Prepare latency data in hours
  const allLatenciesHours: number[] = [];
  const firstReviewLatenciesHours: number[] = [];
  const firstReviewByReviewer = new Map<string, number[]>();
  const allReviewsByReviewer = new Map<string, number[]>();

  for (const r of reviewsOnAuthoredPrs) {
    const seconds = r.reviewLatencySeconds ?? 0;
    if (seconds <= 0) continue;

    const hours = seconds / 3600;
    allLatenciesHours.push(hours);

    // Track all reviews per reviewer
    if (!allReviewsByReviewer.has(r.reviewerLogin)) {
      allReviewsByReviewer.set(r.reviewerLogin, []);
    }
    allReviewsByReviewer.get(r.reviewerLogin)!.push(hours);

    // First-review-only stats
    if (r.wasFirstReview) {
      firstReviewLatenciesHours.push(hours);

      if (!firstReviewByReviewer.has(r.reviewerLogin)) {
        firstReviewByReviewer.set(r.reviewerLogin, []);
      }
      firstReviewByReviewer.get(r.reviewerLogin)!.push(hours);
    }
  }

  if (allLatenciesHours.length < 5 || firstReviewLatenciesHours.length < 3) {
    return null;
  }

  const baselineMedianHours = computeMedianClamped(allLatenciesHours, {
    min: 0,
    max: MAX_HOURS_CUTOFF,
  });

  const totalFirstReviews = firstReviewLatenciesHours.length;
  if (totalFirstReviews === 0) return null;

  type ReviewerStats = {
    reviewer: string;
    medianLatencyHours: number;
    firstReviewCount: number;
    totalReviewCount: number;
    firstShare: number; // fraction of first reviews that this person owns
    bottleneckScore: number;
  };

  const candidates: ReviewerStats[] = [];

  for (const [reviewer, firstLatencies] of firstReviewByReviewer.entries()) {
    const firstCount = firstLatencies.length;
    const totalCount = allReviewsByReviewer.get(reviewer)?.length ?? firstCount;

    // Require a bit of data per reviewer
    if (firstCount < 3) continue;

    const medianLatencyHours = computeMedianClamped(firstLatencies, {
      min: 0,
      max: MAX_HOURS_CUTOFF,
    });

    const firstShare = firstCount / totalFirstReviews;

    // Heuristic thresholds for “bottleneck”:
    // - at least ~30–40% of your first reviews
    // - noticeably slower than baseline
    const isHeavilyReliedOn = firstShare >= 0.2;
    const isNoticeablySlow =
      medianLatencyHours >= baselineMedianHours * 1.25 &&
      medianLatencyHours - baselineMedianHours >= 0.5; // at least 2h slower

    if (!isHeavilyReliedOn || !isNoticeablySlow) continue;

    const bottleneckScore = firstShare * medianLatencyHours;

    candidates.push({
      reviewer,
      medianLatencyHours,
      firstReviewCount: firstCount,
      totalReviewCount: totalCount,
      firstShare,
      bottleneckScore,
    });
  }

  if (candidates.length === 0) {
    // No clear reviewer bottleneck pattern — we can later
    // fall back to time-of-day dead zones or skip entirely.
    return null;
  }

  // Pick the strongest bottleneck: highest combination of "share" + "slow"
  candidates.sort((a, b) => b.bottleneckScore - a.bottleneckScore);
  const best = candidates[0];

  const pctFirst = Math.round(best.firstShare * 100);
  const reviewerLabel = best.reviewer;
  const reviewerMedianLabel = `${best.medianLatencyHours.toFixed(1)}h`;
  const baselineLabel = `${baselineMedianHours.toFixed(1)}h`;
  const timeframe = 'last 4 weeks';

  const title = `You're heavily reliant on ${reviewerLabel} for first reviews`;
  const emphasis = `${pctFirst}% of your first reviews, ${reviewerMedianLabel} median response time`;

  const body = [
    `Over the ${timeframe}, ${reviewerLabel} handled about ${pctFirst}% of the first reviews on your PRs.`,
    `Their median response time was ${reviewerMedianLabel}, compared to ${baselineLabel} across all reviewers.`,
    `This concentration makes your review loop vulnerable to their availability — consider spreading first-review load to a couple of other teammates or explicitly coordinating review expectations with them.`,
  ].join(' ');

  const insight: InsightDraft = {
    id: `review-bottlenecks:reviewer:${reviewerLabel}`,
    kind: 'bottlenecks',
    severity: 'warning',
    title,
    emphasis,
    body,
    timeWindowLabel: 'Last 4 weeks',

    stats: [
      {
        label: 'Share of first reviews',
        value: `${pctFirst}%`,
      },
      {
        label: 'Median response (them)',
        value: reviewerMedianLabel,
      },
      {
        label: 'Median response (overall)',
        value: baselineLabel,
      },
    ],

    metrics: {
      reviewer: reviewerLabel,
      medianLatencyHours: best.medianLatencyHours,
      baselineMedianHours,
      firstReviewCount: best.firstReviewCount,
      totalReviewCount: best.totalReviewCount,
      totalFirstReviews,
    },

    meta: {
      categories: ['reviews', 'bottlenecks'],
      simulated: false,
    },
  };

  return insight;
}
