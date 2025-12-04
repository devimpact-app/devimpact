import { computeMedianClamped } from '@/lib/utils/math';
import { formatHours, formatRange } from '@/lib/utils/date';
import { InsightContext } from '../types';
import { Insight, InsightRelatedItem } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';
import { MAX_HOURS_CUTOFF } from './shared';
import { PullRequest, Review } from '@/lib/db/schema';

const THRESHOLD_MIN_REVIEWS = 5;
const THRESHOLD_MIN_GROUP_REVIEWS = 3;

type ReviewWithPrType = {
  pr: PullRequest;
  review: Review;
};

type ReviewerStats = {
  totalReviews: number;
  uniqueTeammatesReviewed: number;
  uniqueReposReviewed: number;
  firstResponderCount: number;
  blockingCount: number;
  nonBlockingCount: number;
  commentOnlyCount: number;
  approvalsCount: number;
  medianLatencyHours: number | null;
  reviewsPerMergedPr: number | null;

  fastestTeammateLogin: string | null;
  fastestTeammateMedianHours: number | null;
  fastestRepoName: string | null;
  fastestRepoMedianHours: number | null;
};

function formatPercent(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

function computeReviewerStats(ctx: InsightContext): ReviewerStats | null {
  const { authoredPrs, authoredReviews } = ctx;

  if (!authoredReviews || authoredReviews.length === 0) return null;

  const reviews = authoredReviews;

  if (reviews.length < THRESHOLD_MIN_REVIEWS) {
    return null;
  }

  const totalReviews = reviews.length;

  const teammateLogins = new Set<string>();
  const repos = new Set<string>();

  let firstResponderCount = 0;
  let blockingCount = 0;
  let nonBlockingCount = 0;
  let commentOnlyCount = 0;
  let approvalsCount = 0;

  const latencyHours: number[] = [];
  const latencyByAuthor = new Map<string, number[]>();
  const latencyByRepo = new Map<string, number[]>();

  for (const reviewWithPr of reviews) {
    const r = reviewWithPr.review;
    const author = r.prAuthorLogin;
    if (author) teammateLogins.add(author);

    const repo = r.repoFullName;
    if (repo) repos.add(repo);

    if (r.wasFirstReview) firstResponderCount += 1;
    if (r.isBlockingReview) blockingCount += 1;
    if (r.isNonBlockingReview) nonBlockingCount += 1;
    if (r.isCommentOnly) commentOnlyCount += 1;
    if (r.isApproval) approvalsCount += 1;

    if (
      typeof r.reviewLatencySeconds === 'number' &&
      r.reviewLatencySeconds > 0
    ) {
      const hrs = r.reviewLatencySeconds / 3600;
      if (hrs > 0 && hrs <= MAX_HOURS_CUTOFF) {
        latencyHours.push(hrs);

        if (author) {
          const arr = latencyByAuthor.get(author) ?? [];
          arr.push(hrs);
          latencyByAuthor.set(author, arr);
        }

        if (repo) {
          const arr = latencyByRepo.get(repo) ?? [];
          arr.push(hrs);
          latencyByRepo.set(repo, arr);
        }
      }
    }
  }

  const medianLatencyHours =
    latencyHours.length > 0
      ? computeMedianClamped(latencyHours, {
          min: 0,
          max: MAX_HOURS_CUTOFF,
        })
      : null;

  const mergedPrs = authoredPrs.filter((pr) => !!pr.mergedAt) ?? [];
  const reviewsPerMergedPr =
    mergedPrs.length > 0 ? totalReviews / mergedPrs.length : null;

  // Find fastest teammate (by median latency)
  let fastestTeammateLogin: string | null = null;
  let fastestTeammateMedianHours: number | null = null;

  for (const [login, arr] of latencyByAuthor.entries()) {
    if (arr.length < THRESHOLD_MIN_GROUP_REVIEWS) continue;
    const median = computeMedianClamped(arr, { min: 0, max: MAX_HOURS_CUTOFF });
    if (
      fastestTeammateMedianHours == null ||
      median < fastestTeammateMedianHours
    ) {
      fastestTeammateMedianHours = median;
      fastestTeammateLogin = login;
    }
  }

  // Fastest repo
  let fastestRepoName: string | null = null;
  let fastestRepoMedianHours: number | null = null;

  for (const [repo, arr] of latencyByRepo.entries()) {
    if (arr.length < THRESHOLD_MIN_GROUP_REVIEWS) continue;
    const median = computeMedianClamped(arr, { min: 0, max: MAX_HOURS_CUTOFF });
    if (fastestRepoMedianHours == null || median < fastestRepoMedianHours) {
      fastestRepoMedianHours = median;
      fastestRepoName = repo;
    }
  }

  return {
    totalReviews,
    uniqueTeammatesReviewed: teammateLogins.size,
    uniqueReposReviewed: repos.size,
    firstResponderCount,
    blockingCount,
    nonBlockingCount,
    commentOnlyCount,
    approvalsCount,
    medianLatencyHours,
    reviewsPerMergedPr,
    fastestTeammateLogin,
    fastestTeammateMedianHours,
    fastestRepoName,
    fastestRepoMedianHours,
  };
}

function pickRepresentativeReviews(ctx: InsightContext): InsightRelatedItem[] {
  const { authoredReviews } = ctx;
  if (!authoredReviews || authoredReviews.length === 0) return [];

  const reviews = authoredReviews;

  // Fastest review with valid latency
  const withLatency: {
    review: ReviewWithPrType;
    hours: number;
  }[] = reviews
    .filter(
      (r) =>
        !!r.review.reviewLatencySeconds && r.review.reviewLatencySeconds > 0
    )
    .map((r) => ({
      review: r,
      hours: r.review.reviewLatencySeconds! / 3600,
    }))
    .filter(({ hours }) => hours > 0 && hours <= MAX_HOURS_CUTOFF);

  const fastest = withLatency
    .slice()
    .sort((a, b) => a.hours - b.hours)[0]?.review;

  // Deepest review by comment count
  const deepest = reviews
    .slice()
    .sort(
      (a, b) =>
        (b.review.reviewCommentsCount ?? 0) -
        (a.review.reviewCommentsCount ?? 0)
    )[0];

  const picked = new Map<string, ReviewWithPrType>();
  if (fastest) picked.set(fastest.review.id, fastest);
  if (deepest && !picked.has(deepest.review.id))
    picked.set(deepest.review.id, deepest);

  const items: InsightRelatedItem[] = [];

  for (const reviewWithPr of picked.values()) {
    const r = reviewWithPr.review;
    const hours =
      typeof r.reviewLatencySeconds === 'number' && r.reviewLatencySeconds > 0
        ? r.reviewLatencySeconds / 3600
        : null;

    items.push({
      entityType: 'review',
      id: r.id,
      title:
        r.prNumber && r.repoFullName
          ? `${r.repoFullName} · PR #${r.prNumber}`
          : (r.htmlUrl ?? 'Code review'),
      subtitle: r.prAuthorLogin
        ? `Reviewed PR by @${r.prAuthorLogin}`
        : undefined,
      htmlUrl: r.htmlUrl,
      stats: [
        {
          label: 'Response time',
          value: formatHours(hours),
        },
        {
          label: 'Review comments',
          value: String(r.reviewCommentsCount ?? 0),
        },
        {
          label: 'Decision',
          value: r.isApproval
            ? 'Approval'
            : r.isChangeRequest
              ? 'Changes requested'
              : r.isCommentOnly
                ? 'Comment-only'
                : 'Review',
        },
      ],
      meta: {
        prNumber: r.prNumber,
        repoFullName: r.repoFullName,
        prAuthorLogin: r.prAuthorLogin,
        reviewLatencyHours: hours,
      },
    });
  }

  return items;
}

export function generateCollaborationSnapshotInsight(
  ctx: InsightContext
): Insight | null {
  const stats = computeReviewerStats(ctx);
  if (!stats) return null;

  const {
    totalReviews,
    uniqueTeammatesReviewed,
    uniqueReposReviewed,
    firstResponderCount,
    blockingCount,
    nonBlockingCount,
    commentOnlyCount,
    approvalsCount,
    medianLatencyHours,
    reviewsPerMergedPr,
    fastestTeammateLogin,
    fastestTeammateMedianHours,
    fastestRepoName,
    fastestRepoMedianHours,
  } = stats;

  const firstResponderRatio =
    totalReviews > 0 ? firstResponderCount / totalReviews : null;

  const blockingShare = totalReviews > 0 ? blockingCount / totalReviews : null;
  const nonBlockingShare =
    totalReviews > 0 ? nonBlockingCount / totalReviews : null;

  const medianLatencyLabel = formatHours(medianLatencyHours);
  const firstResponderLabel = formatPercent(firstResponderRatio);
  const reviewsPerPrLabel =
    reviewsPerMergedPr != null ? reviewsPerMergedPr.toFixed(1) : '—';

  const blockingLabel =
    blockingShare != null ? formatPercent(blockingShare) : '—';
  const nonBlockingLabel =
    nonBlockingShare != null ? formatPercent(nonBlockingShare) : '—';

  const title = `How you’ve been showing up in reviews`;
  const emphasisParts: string[] = [];

  emphasisParts.push(
    `${totalReviews} review${totalReviews === 1 ? '' : 's'} in this window`
  );

  if (firstResponderRatio != null) {
    emphasisParts.push(`${firstResponderLabel} as a first responder`);
  }

  if (medianLatencyHours != null) {
    emphasisParts.push(`median response time ~${medianLatencyLabel}`);
  }

  const emphasis = emphasisParts.join(' · ');

  const primaryStats = [
    {
      label: 'Reviews given',
      value: String(totalReviews),
      importance: 'primary' as const,
    },
    {
      label: 'Teammates you reviewed',
      value: String(uniqueTeammatesReviewed),
      importance: 'primary' as const,
    },
    {
      label: 'Repos you reviewed in',
      value: String(uniqueReposReviewed),
      importance: 'primary' as const,
    },
  ];

  const secondaryStats = [
    {
      label: 'First-responder share',
      value: firstResponderLabel,
      importance: 'secondary' as const,
    },
    {
      label: 'Median response time',
      value: medianLatencyLabel,
      importance: 'secondary' as const,
    },
    {
      label: 'Reviews per PR shipped',
      value: reviewsPerPrLabel,
      importance: 'secondary' as const,
    },
    {
      label: 'Blocking vs non-blocking',
      value: `${blockingLabel} / ${nonBlockingLabel}`,
      importance: 'secondary' as const,
    },
  ];

  if (fastestTeammateLogin && fastestTeammateMedianHours != null) {
    secondaryStats.push({
      label: 'Fastest teammate to review',
      value: `@${fastestTeammateLogin} (~${formatHours(
        fastestTeammateMedianHours
      )})`,
      importance: 'secondary',
    });
  }

  if (fastestRepoName && fastestRepoMedianHours != null) {
    secondaryStats.push({
      label: 'Fastest repo to review in',
      value: `${fastestRepoName} (~${formatHours(fastestRepoMedianHours)})`,
      importance: 'secondary',
    });
  }

  const bodyParts: string[] = [];

  bodyParts.push(
    `In this window, you gave ${totalReviews} review${totalReviews === 1 ? '' : 's'} across ${uniqueReposReviewed} repo${uniqueReposReviewed === 1 ? '' : 's'} and ${uniqueTeammatesReviewed} teammate${uniqueTeammatesReviewed === 1 ? '' : 's'}.`
  );

  if (firstResponderRatio != null) {
    bodyParts.push(
      `You were a first responder on about ${firstResponderLabel.toLowerCase()} of your reviews, which is a good signal of collaboration and support.`
    );
  }

  if (medianLatencyHours != null) {
    bodyParts.push(
      `Your median review response time is around ${medianLatencyLabel}, giving others reasonably quick feedback on their work.`
    );
  }

  if (blockingShare != null || nonBlockingShare != null) {
    bodyParts.push(
      `Most of your reviews fall into a mix of blocking and non-blocking feedback (${blockingLabel} blocking, ${nonBlockingLabel} non-blocking), with approvals and comment-only reviews layered on top.`
    );
  }

  if (reviewsPerMergedPr != null) {
    bodyParts.push(
      `Relative to your own shipping, you’re averaging about ${reviewsPerPrLabel} reviews for every PR you merge, which helps give your team more signal than just your own code.`
    );
  }

  if (fastestTeammateLogin && fastestTeammateMedianHours != null) {
    bodyParts.push(
      `You tend to respond fastest to PRs from @${fastestTeammateLogin}, with a typical turnaround of ~${formatHours(
        fastestTeammateMedianHours
      )}.`
    );
  }

  if (fastestRepoName && fastestRepoMedianHours != null) {
    bodyParts.push(
      `Your quickest reviews by repo are in ${fastestRepoName}, where you usually reply in about ${formatHours(
        fastestRepoMedianHours
      )}.`
    );
  }

  const body = bodyParts.join(' ');

  // Scoring: descriptive but quite personalized
  const signalStrength = 2;
  const recurrence = 3; // always-on snapshot
  const impact = 2; // collaboration is meaningful in 1:1s
  const novelty = 2;
  const personalization = 5;

  const score = scoreInsightBase({
    signalStrength,
    recurrence,
    impact,
    novelty,
    personalization,
  });

  const relatedItems = pickRepresentativeReviews(ctx);

  const insight: Insight = {
    id: 'collaboration_snapshot:recent',
    kind: 'fast_loops',
    severity: 'info',
    title,
    emphasis,
    body,
    timeWindowLabel: formatRange(ctx.windowStart, ctx.windowEnd),
    stats: [...primaryStats, ...secondaryStats],
    score,
    relatedItems,
  };

  return insight;
}
