import { db } from '@/lib/db/client';
import {
  githubPrs,
  githubReviews,
  githubReviewComments,
  githubTimelineEvents,
  GithubPR,
  GithubTimelineEvent,
  GithubReview,
  GithubReviewComment,
} from '@/lib/db/schema/github-raw';
import {
  inferredTeamMemberships,
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

async function getInferredTeams({
  userId,
  username,
}: {
  userId: string;
  username: string;
}): Promise<Set<string>> {
  const memberships = await db
    .select()
    .from(inferredTeamMemberships)
    .where(
      and(
        eq(inferredTeamMemberships.tenantId, userId),
        eq(inferredTeamMemberships.githubLogin, username)
      )
    );

  const activeTeamMemberships = memberships.filter((m) => {
    if (m.confidence === 'high') return true;
    if (m.confidence === 'medium') {
      const score = m.score ?? 0;
      const total = m.evidenceCounts?.totalReviewsAfterAnyTeamRequest ?? 0;
      return score >= 0.55 && total >= 3;
    }
    return false;
  });

  return new Set(activeTeamMemberships.map((m) => `${m.org}/${m.teamSlug}`));
}

export async function batchNormalizeUserReviews(
  userId: string,
  username: string,
  normalizedPrIds: string[]
): Promise<number> {
  const inferredTeamsSet = await getInferredTeams({
    userId,
    username,
  });

  const rawReviews = await db
    .select()
    .from(githubReviews)
    .where(
      and(
        eq(githubReviews.tenantId, userId),
        inArray(githubReviews.prId, normalizedPrIds)
      )
    );
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
        inArray(githubReviews.prId, normalizedPrIds),
        not(
          eq(
            githubReviews.reviewerGithubLogin,
            githubReviews.prAuthorGithubLogin
          )
        )
      )
    );

  if (reviewsNeedingNormalization.length === 0) return 0;

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
  const reviewsByPrId = groupBy(rawReviews, 'prId');
  const timelineByPrId = groupBy(timeline, 'prId');
  const commentsByReviewId = groupBy(comments, 'reviewId');

  await db.transaction(async (tx) => {
    for (const row of reviewsNeedingNormalization) {
      const review = row.raw;
      const existingNorm = row.norm;

      const pr = prById.get(review.prId);
      if (!pr) break;

      const metrics = calculateMetrics({
        pr,
        timeline: timelineByPrId[review.prId] || [],
        review,
        allReviews: reviewsByPrId[review.prId] || [],
        reviewComments: commentsByReviewId[review.id] || [],
        userGithubLogin: username,
        inferredTeams: inferredTeamsSet,
      });

      if (!existingNorm) {
        await tx.insert(reviews).values(metrics);
      } else {
        const { githubReviewId, tenantId, ...updateFields } = metrics;
        await tx
          .update(reviews)
          .set(updateFields)
          .where(eq(reviews.id, existingNorm.id));
      }
    }
  });

  console.log(`✓ Normalized ${reviewsNeedingNormalization.length} reviews`);
  return reviewsNeedingNormalization.length;
}

interface CalculateMetricsInput {
  pr: PullRequest;
  timeline: GithubTimelineEvent[];
  review: GithubReview;
  allReviews: GithubReview[];
  reviewComments: GithubReviewComment[];
  userGithubLogin: string;
  inferredTeams: Set<string>; // "org/teamSlug"
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

  const first = nonAuthorReviews[0];
  const wasFirstReview = !!first && first.id === review.id;

  return {
    githubReviewId: review.id,
    tenantId: review.tenantId,

    prId: pr.id,
    prNumber: pr.prNumber,
    repoFullName: pr.repoFullName,
    prAuthorLogin: pr.prAuthorLogin,

    reviewerLogin: review.reviewerGithubLogin,
    reviewerIsTenant: review.reviewerGithubLogin === userGithubLogin,

    state: normState(review.state),
    submittedAt: review.submittedAt,
    commitId: review.commitId,
    htmlUrl: review.htmlUrl || '',
    body: review.body || '',

    reviewLatencySeconds,
    reviewAnchorAt: anchorAt,
    reviewAnchorType: anchorType,
    anchorTeamSlug: anchorTeamSlug,

    isApproval: normState(review.state) === 'approved',
    isChangeRequest: normState(review.state) === 'changes_requested',
    isCommentOnly: normState(review.state) === 'commented',
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
  inferredTeams,
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
      e.requestedTargetType === 'team' &&
      (inferredTeams.size === 0 ||
        inferredTeams.has(`${e.requestedTeamOrg}/${e.requestedTeamSlug}`))
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
