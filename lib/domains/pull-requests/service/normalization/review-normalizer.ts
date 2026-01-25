import { db } from '@/lib/db/client';
import {
  githubPrs,
  githubReviews,
  githubReviewComments,
  githubTimelineEvents,
  GithubTimelineEvent,
  GithubReview,
  GithubReviewComment,
} from '@/lib/db/schema/github-raw';
import {
  PullRequest,
  pullRequests,
  reviews,
} from '@/lib/db/schema/github-normalized';
import { eq, and, inArray, or, isNull, gt, not } from 'drizzle-orm';
import {
  computeCycles,
  diffSecondsRounded,
  findCycleForTimestamp,
  groupBy,
  lastBefore,
  normState,
  sortAndBound,
} from './helpers';

export async function batchNormalizeUserReviews(
  userId: string,
  username: string
): Promise<{
  touchedReviewIds: string[];
}> {
  const reviewsNeedingNormalization = await db
    .select({
      raw: githubReviews,
      norm: reviews,
    })
    .from(githubReviews)
    .leftJoin(
      reviews,
      and(
        eq(reviews.tenantId, githubReviews.tenantId),
        eq(reviews.githubReviewId, githubReviews.id)
      )
    )
    .where(
      and(
        eq(githubReviews.tenantId, userId),
        isNull(reviews.id),
        not(
          eq(
            githubReviews.reviewerGithubLogin,
            githubReviews.prAuthorGithubLogin
          )
        )
      )
    );

  if (reviewsNeedingNormalization.length === 0)
    return {
      touchedReviewIds: [],
    };

  console.log(
    `Normalizing ${reviewsNeedingNormalization.length} reviews for user ${userId}`
  );

  const prIds = Array.from(
    new Set(reviewsNeedingNormalization.map((r) => r.raw.prId))
  );

  // Fetch supporting data in bulk
  const [prs, timeline, comments] = await Promise.all([
    db
      .select({
        rawId: githubPrs.id,
        pr: pullRequests,
      })
      .from(githubPrs)
      .leftJoin(pullRequests, and(eq(githubPrs.id, pullRequests.githubPrId)))
      .where(inArray(githubPrs.id, prIds)),

    db
      .select()
      .from(githubTimelineEvents)
      .where(inArray(githubTimelineEvents.prId, prIds)),

    db
      .select()
      .from(githubReviewComments)
      .where(inArray(githubReviewComments.prId, prIds)),
  ]);

  const prById = new Map(prs.map((p) => [p.rawId, p.pr]));
  const reviewsByPrId = groupBy(
    reviewsNeedingNormalization.map((r) => r.raw),
    'prId'
  );
  const timelineByPrId = groupBy(timeline, 'prId');
  const commentsByReviewId = groupBy(comments, 'reviewId');

  const reviewStartTime = Date.now();
  let processed = 0;

  const metricsToSave = reviewsNeedingNormalization
    .map((row) => {
      const review = row.raw;
      const pr = prById.get(review.prId);

      if (!pr) {
        console.warn('Skipping review - PR not found', {
          reviewId: review.id,
          prId: review.prId,
        });
        return null;
      }

      const metrics = calculateMetrics({
        pr,
        timeline: timelineByPrId[review.prId] || [],
        review,
        allReviews: reviewsByPrId[review.prId] || [],
        reviewComments: commentsByReviewId[review.id] || [],
        userGithubLogin: username,
      });

      return {
        existingNorm: row.norm,
        review: row.raw,
        metrics,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  let committed = false;
  const touchedReviewIds: string[] = [];

  try {
    await db.transaction(async (tx) => {
      for (const { existingNorm, review, metrics } of metricsToSave) {
        if (!existingNorm) {
          const result = await tx
            .insert(reviews)
            .values(metrics)
            .returning({ id: reviews.id });

          console.log('Inserted normalized review', {
            reviewId: review.id,
            dbId: result[0]?.id,
          });
          touchedReviewIds.push(result[0].id);
        } else {
          const { githubReviewId, tenantId, ...updateFields } = metrics;
          const result = await tx
            .update(reviews)
            .set(updateFields)
            .where(eq(reviews.id, existingNorm.id))
            .returning({ id: reviews.id });

          console.log('Updated normalized review', {
            reviewId: existingNorm.id,
            affected: result.length,
          });
          touchedReviewIds.push(result[0].id);
        }
        processed += 1;
      }
      committed = true;
    });

    if (processed > 0 && metricsToSave.length > 0) {
      const sampleGithubReviewId = metricsToSave[0].metrics.githubReviewId;
      const verification = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(eq(reviews.githubReviewId, sampleGithubReviewId))
        .limit(1);

      if (verification.length === 0) {
        throw new Error(
          `CRITICAL: Transaction appeared to commit but review ${sampleGithubReviewId} not found in DB. ` +
            `Processed ${processed} reviews but commit may have failed silently.`
        );
      }
    }

    console.log(`✓ Normalized ${processed} reviews (verified)`);
  } catch (err) {
    console.error('Review normalization FAILED', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      duration: Date.now() - reviewStartTime,
      processed,
      committed,
      totalReviews: metricsToSave.length,
      originalCount: reviewsNeedingNormalization.length,
    });
    throw err;
  }

  return {
    touchedReviewIds,
  };
}

interface CalculateMetricsInput {
  pr: PullRequest;
  timeline: GithubTimelineEvent[];
  review: GithubReview;
  allReviews: GithubReview[];
  reviewComments: GithubReviewComment[];
  userGithubLogin: string;
}

function calculateMetrics(input: CalculateMetricsInput) {
  const { pr, review, reviewComments, allReviews, userGithubLogin } = input;

  const { anchorAt, anchorType, anchorTeamSlug } = computeReviewAnchorAt(input);

  const reviewLatencySeconds = diffSecondsRounded(anchorAt, review.submittedAt);

  const nonAuthorReviews = allReviews
    .filter(
      (r) =>
        r.reviewerGithubLogin !== pr.prAuthorLogin &&
        r.submittedAt &&
        r.submittedAt >= anchorAt
    )
    .sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime());

  const firstNonAuthorReview = nonAuthorReviews[0];
  const wasFirstReview =
    !!firstNonAuthorReview && firstNonAuthorReview.id === review.id;

  const firstApprovalIndex = nonAuthorReviews.findIndex(
    (r) => normState(r.state) === 'approved'
  );

  const stateNorm = normState(review.state);

  let isBlockingReview = false;
  if (stateNorm === 'changes_requested') {
    isBlockingReview = true;
  } else if (stateNorm === 'commented') {
    // If there's no approval yet, OR this review comes before the first approval
    if (
      firstApprovalIndex === -1 ||
      nonAuthorReviews.findIndex((r) => r.id === review.id) < firstApprovalIndex
    ) {
      isBlockingReview = true;
    }
  }

  const isNonBlockingReview = !isBlockingReview;

  return {
    githubReviewId: review.id,
    tenantId: review.tenantId,

    prId: pr.id,
    prNumber: pr.prNumber,
    repoFullName: pr.repoFullName,
    prAuthorLogin: pr.prAuthorLogin,

    reviewerLogin: review.reviewerGithubLogin,
    reviewerIsTenant: review.reviewerGithubLogin === userGithubLogin,

    state: stateNorm,
    submittedAt: review.submittedAt,
    commitId: review.commitId,
    htmlUrl: review.htmlUrl || '',
    body: review.body || '',

    reviewLatencySeconds,
    reviewAnchorAt: anchorAt,
    reviewAnchorType: anchorType,
    anchorTeamSlug: anchorTeamSlug,

    isApproval: stateNorm === 'approved',
    isChangeRequest: stateNorm === 'changes_requested',
    isCommentOnly: stateNorm === 'commented',
    isBlockingReview,
    isNonBlockingReview,
    reviewCommentsCount: reviewComments.length,

    wasDirectlyRequested: anchorType === 'direct_request',
    wasFirstReview,

    normalizedAt: new Date(),
    sourceUpdatedAt: review.submittedAt ?? new Date(),
    normalizationVersion: 1,
  };
}

type AnchorType =
  | 'direct_request'
  | 'team_request'
  | 'ready_for_review'
  | 'first_request_in_cycle'
  | 'cycle_start'
  | 'pr_open';

export function computeReviewAnchorAt({
  pr,
  timeline,
  review,
}: CalculateMetricsInput): {
  anchorAt: Date;
  anchorType: AnchorType;
  anchorTeamSlug: string | null;
} {
  const cutoff = review.submittedAt ?? new Date();
  const events = sortAndBound(timeline, cutoff);
  const cycles = computeCycles(pr.createdAt, events, cutoff);

  const cycle = review.submittedAt
    ? findCycleForTimestamp(cycles, review.submittedAt)
    : cycles[cycles.length - 1];

  // If direct request to this reviewer, always use that as anchor
  const directReq = lastBefore(
    events,
    cutoff,
    (e) =>
      e.createdAt >= cycle.start &&
      e.createdAt <= cycle.end &&
      e.eventType === 'review_requested' &&
      e.requestedTargetType === 'user' &&
      e.requestedReviewerLogin === review.reviewerGithubLogin
  );
  if (directReq) {
    const laterRemoval = lastBefore(
      events,
      cutoff,
      (e) =>
        e.createdAt >= directReq.createdAt &&
        e.createdAt <= cycle.end &&
        e.eventType === 'review_request_removed' &&
        e.requestedTargetType === 'user' &&
        e.requestedReviewerLogin === review.reviewerGithubLogin
    );

    const requestStillActive = !laterRemoval;
    if (requestStillActive) {
      return {
        anchorAt: directReq.createdAt,
        anchorType: 'direct_request',
        anchorTeamSlug: null,
      };
    }
  }

  // Otherwise, use latest team request if there is one
  const teamReq = lastBefore(
    events,
    cutoff,
    (e) =>
      e.createdAt >= cycle.start &&
      e.createdAt <= cycle.end &&
      e.eventType === 'review_requested' &&
      e.requestedTargetType === 'team'
  );
  if (teamReq) {
    const laterRemoval = lastBefore(
      events,
      cutoff,
      (e) =>
        e.createdAt >= teamReq.createdAt &&
        e.createdAt <= cycle.end &&
        e.eventType === 'review_request_removed' &&
        e.requestedTargetType === 'team' &&
        e.requestedTeamSlug === teamReq.requestedTeamSlug
    );

    const requestStillActive = !laterRemoval;
    if (requestStillActive) {
      return {
        anchorAt: teamReq.createdAt,
        anchorType: 'team_request',
        anchorTeamSlug: teamReq.requestedTeamSlug ?? null,
      };
    }
  }

  // Otherwise, use last ready for review event
  const ready = lastBefore(
    events,
    cutoff,
    (e) =>
      e.createdAt >= cycle.start &&
      e.createdAt <= cycle.end &&
      e.eventType === 'ready_for_review'
  );
  if (ready) {
    return {
      anchorAt: ready.createdAt,
      anchorType: 'ready_for_review',
      anchorTeamSlug: null,
    };
  }

  // Otherwise, use any generic review request
  const anyReq = events.find(
    (e) =>
      e.createdAt >= cycle.start &&
      e.createdAt <= cycle.end &&
      e.createdAt <= cutoff &&
      e.eventType === 'review_requested'
  );
  if (anyReq) {
    return {
      anchorAt: anyReq.createdAt,
      anchorType: 'first_request_in_cycle',
      anchorTeamSlug: anyReq.requestedTeamSlug ?? null,
    };
  }

  // finnlly, fall back to start of cycle or pr open
  const isPrOpen = cycle.start.getTime() === pr.createdAt.getTime();
  return {
    anchorAt: cycle.start,
    anchorType: isPrOpen ? 'pr_open' : 'cycle_start',
    anchorTeamSlug: null,
  };
}
