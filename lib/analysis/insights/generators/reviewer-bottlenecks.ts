import { InsightContext, InsightDraft } from '../types';
import { computeMedianClamped } from '@/lib/utils/math';
import { MAX_HOURS_CUTOFF } from './shared';
import { Insight, InsightRelatedItem } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';
import { formatRange } from '@/lib/utils/date';

type ReviewerStats = {
  reviewer: string;
  medianLatencyHours: number;
  firstReviewCount: number;
  totalReviewCount: number;
  firstShare: number; // fraction of first reviews that this person owns
  bottleneckScore: number;
};

// Thresholds
const THRESHOLD_MIN_AUTHORED_PRS = 5;
const THRESHOLD_MIN_REVIEWS = 5;
const THRESHOLD_MIN_FIRST_REVIEWS_FOR_REVIEWER = 3;
const THRESHOLD_MIN_SHARE_OF_FIRST_REVIEWS = 0.5;
const THRESHOLD_MIN_SLOWER_PERCENTAGE = 20;
const THRESHOLD_MIN_SLOWER_HOURS = 2;

export function generateReviewerBottleneckInsight(
  ctx: InsightContext
): Insight | null {
  const { authoredPrs, reviewsOnAuthoredPrs } = ctx;

  // Need some minimum data to say anything non-silly
  if (!authoredPrs || authoredPrs.length < THRESHOLD_MIN_AUTHORED_PRS)
    return null;
  if (
    !reviewsOnAuthoredPrs ||
    reviewsOnAuthoredPrs.length < THRESHOLD_MIN_REVIEWS
  )
    return null;

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

  const baselineMedianHours = computeMedianClamped(firstReviewLatenciesHours, {
    min: 0,
    max: MAX_HOURS_CUTOFF,
  });

  const totalFirstReviews = firstReviewLatenciesHours.length;
  if (totalFirstReviews === 0) return null;

  const candidates: ReviewerStats[] = [];
  for (const [reviewer, firstLatencies] of firstReviewByReviewer.entries()) {
    const firstCount = firstLatencies.length;
    const totalCount = allReviewsByReviewer.get(reviewer)?.length ?? firstCount;

    // Require a bit of data per reviewer
    if (firstCount < THRESHOLD_MIN_FIRST_REVIEWS_FOR_REVIEWER) continue;

    const medianLatencyHours = computeMedianClamped(firstLatencies, {
      min: 0,
      max: MAX_HOURS_CUTOFF,
    });

    const firstShare = firstCount / totalFirstReviews;

    // Heuristic thresholds for “bottleneck”:
    // - a significant chunk of your first reviews
    // - noticeably slower than baseline
    const isHeavilyReliedOn =
      firstShare >= THRESHOLD_MIN_SHARE_OF_FIRST_REVIEWS;
    const isNoticeablySlow =
      medianLatencyHours >=
        baselineMedianHours * (1 + THRESHOLD_MIN_SLOWER_PERCENTAGE / 100) &&
      medianLatencyHours - baselineMedianHours >= THRESHOLD_MIN_SLOWER_HOURS;

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
  const timeframe = 'recent period';

  const title = `You're heavily reliant on ${reviewerLabel} for first reviews`;
  const emphasis = `${pctFirst}% of your first reviews, ${reviewerMedianLabel} median response time`;

  const body = [
    `Over the ${timeframe}, ${reviewerLabel} handled about ${pctFirst}% of the first reviews on your PRs.`,
    `Their median response time was ${reviewerMedianLabel}, compared to ${baselineLabel} across all reviewers.`,
    `This concentration makes your review loop vulnerable to their availability — consider spreading first-review load to a couple of other teammates or explicitly coordinating review expectations with them.`,
  ].join(' ');

  // Simple scoring v0
  const latencyDelta = best.medianLatencyHours - baselineMedianHours; // hours slower than baseline
  const firstShare = best.firstShare;

  // signalStrength: how slow & concentrated this bottleneck is
  let signalStrength = 2;
  if (latencyDelta >= 8 && firstShare >= 0.35) signalStrength = 5;
  else if (latencyDelta >= 4 && firstShare >= 0.3) signalStrength = 4;
  else if (latencyDelta >= 2 && firstShare >= 0.25) signalStrength = 3;

  // recurrence: how often this shows up (share + absolute count)
  let recurrence = 2;
  if (best.firstReviewCount >= 10 && firstShare >= 0.35) recurrence = 5;
  else if (best.firstReviewCount >= 6 && firstShare >= 0.3) recurrence = 4;
  else if (best.firstReviewCount >= 4 && firstShare >= 0.25) recurrence = 3;

  // impact: how much time is being lost
  let impact = 2;
  if (latencyDelta >= 12) impact = 5;
  else if (latencyDelta >= 6) impact = 4;
  else if (latencyDelta >= 3) impact = 3;

  const novelty = 3; // baseline for now
  const personalization = 4; // “this person is a bottleneck for you”

  const score = scoreInsightBase({
    signalStrength,
    recurrence,
    impact,
    novelty,
    personalization,
  });

  const relatedItems: InsightRelatedItem[] = reviewsOnAuthoredPrs
    .slice()
    .filter((r) => r.wasFirstReview && r.reviewerLogin === reviewerLabel)
    .map((r) => {
      const hours = (r.reviewLatencySeconds ?? 0) / 3600;
      return {
        entityType: 'review',
        id: r.id,
        title: r.state,
        subtitle: `Review on PR ${r.prId}`,
        htmlUrl: r.htmlUrl,
        stats: [
          { label: 'Latency', value: `${hours.toFixed(1)}h` },
          { label: 'First review?', value: 'Yes' },
        ],
        meta: {
          prId: r.prId,
          latencyHours: hours,
          submittedAt: r.submittedAt,
        },
      } as InsightRelatedItem;
    })
    .sort((a, b) => b.meta?.latencyHours - a.meta?.latencyHours)
    .slice(0, 10);

  const insight: Insight = {
    id: `review-bottlenecks:reviewer:${reviewerLabel}`,
    kind: 'bottlenecks',
    severity: 'warning',
    title,
    emphasis,
    body,
    timeWindowLabel: formatRange(ctx.windowStart, ctx.windowEnd),
    stats: [
      {
        label: 'Share of first reviews',
        value: `${pctFirst}%`,
        importance: 'primary',
      },
      {
        label: 'Median response (them)',
        value: reviewerMedianLabel,
        importance: 'primary',
      },
      {
        label: 'Median response (overall)',
        value: baselineLabel,
        importance: 'primary',
      },
    ],
    score,
    transparency: {
      summary:
        'Shown because one reviewer is handling a large share of your first reviews and is noticeably slower than your overall baseline.',
      bullets: [
        `This reviewer handled ${pctFirst}% of your first reviews in this window (threshold: at least ${Math.round(
          THRESHOLD_MIN_SHARE_OF_FIRST_REVIEWS * 100
        )}%).`,
        `Their median response time is ${best.medianLatencyHours.toFixed(
          1
        )}h vs ${baselineMedianHours.toFixed(1)}h across all reviewers.`,
        `We only surface this when they are both heavily relied on and at least ${THRESHOLD_MIN_SLOWER_PERCENTAGE}% and ${THRESHOLD_MIN_SLOWER_HOURS}h slower than your typical first review.`,
      ],
      thresholds: [
        {
          key: 'minAuthoredPrs',
          label: 'Minimum authored PRs',
          actual: authoredPrs.length,
          condition: `>= ${THRESHOLD_MIN_AUTHORED_PRS}`,
        },
        {
          key: 'minFirstReviewsForReviewer',
          label: 'Min first reviews per reviewer',
          actual: best.firstReviewCount,
          condition: `>= ${THRESHOLD_MIN_FIRST_REVIEWS_FOR_REVIEWER}`,
        },
        {
          key: 'shareOfFirstReviews',
          label: 'Share of your first reviews',
          actual: best.firstShare,
          condition: `>= ${THRESHOLD_MIN_SHARE_OF_FIRST_REVIEWS} (~${Math.round(
            THRESHOLD_MIN_SHARE_OF_FIRST_REVIEWS * 100
          )}%)`,
        },
        {
          key: 'latencyDeltaHours',
          label: 'Extra hours vs baseline',
          actual: latencyDelta,
          condition: `>= ${THRESHOLD_MIN_SLOWER_HOURS}h and >= ${THRESHOLD_MIN_SLOWER_PERCENTAGE}% slower`,
        },
      ],
    },
    relatedItems,
  };

  return insight;
}
