import { db } from "@/lib/db/client";
import {
  githubPrs,
  githubReviews,
  githubReviewComments,
  githubTimelineEvents,
  GithubPR,
  GithubTimelineEvent,
  GithubReview,
  GithubReviewComment,
} from "@/lib/db/schema/github-raw";
import { reviews } from "@/lib/db/schema/github-normalized";
import { eq, and, inArray } from "drizzle-orm";
import {
  computeCycles,
  diffSecondsRounded,
  findCycleForTimestamp,
  groupBy,
  lastBefore,
  normState,
  sortAndBound,
} from "./helpers";

export async function batchNormalizeUserReviews(
  userId: string,
  username: string,
): Promise<number> {
  const rawReviews = await db
    .select()
    .from(githubReviews)
    .where(eq(githubReviews.tenantId, userId));

  if (rawReviews.length === 0) return 0;

  console.log(`Normalizing ${rawReviews.length} reviews for user ${userId}`);

  const prIds = Array.from(new Set(rawReviews.map((r) => r.prId)));

  // Fetch supporting data in bulk
  const [prs, timeline, comments] = await Promise.all([
    db.select().from(githubPrs).where(inArray(githubPrs.id, prIds)),

    db
      .select()
      .from(githubTimelineEvents)
      .where(inArray(githubTimelineEvents.prId, prIds)),

    db
      .select()
      .from(githubReviewComments)
      .where(inArray(githubReviewComments.prId, prIds)),
  ]);

  const prById = new Map(prs.map((p) => [p.id, p]));
  const reviewsByPrId = groupBy(rawReviews, "prId");
  const timelineByPrId = groupBy(timeline, "prId");
  const commentsByReviewId = groupBy(comments, "reviewId");

  // 4. Calculate metrics for all PRs (in memory)
  console.log("Calculating metrics...");
  const normalizedData = rawReviews
    .map((review) => {
      const pr = prById.get(review.prId);
      if (!pr) return null;
      return calculateMetrics({
        pr,
        timeline: timelineByPrId[review.prId] || [],
        review,
        allReviews: reviewsByPrId[review.prId] || [],
        reviewComments: commentsByReviewId[review.id] || [],
        userGithubLogin: username,
        // TODO: add if we have it
        inferredTeamSlug: null,
      });
    })
    .filter((d) => !!d);

  // Batch upsert
  console.log("Saving normalized data...");
  await db.transaction(async (tx) => {
    const existingReviews = await tx
      .select({ githubReviewId: reviews.githubReviewId })
      .from(reviews)
      .where(
        inArray(
          reviews.githubReviewId,
          normalizedData.map((d) => d.githubReviewId),
        ),
      );

    const existingIds = new Set(existingReviews.map((r) => r.githubReviewId));

    // Split
    const toInsert = normalizedData.filter(
      (d) => !existingIds.has(d.githubReviewId),
    );
    const toUpdate = normalizedData.filter((d) =>
      existingIds.has(d.githubReviewId),
    );

    // Batch insert new
    if (toInsert.length > 0) {
      await tx.insert(reviews).values(toInsert);
    }

    // Update existing (loop is fine, it's fast)
    for (const data of toUpdate) {
      const { githubReviewId, tenantId, ...updateFields } = data;
      await tx
        .update(reviews)
        .set(updateFields)
        .where(eq(reviews.githubReviewId, githubReviewId));
    }
  });

  console.log(`✓ Normalized ${normalizedData.length} reviews`);
  return normalizedData.length;
}

interface CalculateMetricsInput {
  pr: GithubPR;
  timeline: GithubTimelineEvent[];
  review: GithubReview;
  allReviews: GithubReview[];
  reviewComments: GithubReviewComment[];
  userGithubLogin: string;
  inferredTeamSlug: string | null;
}

function calculateMetrics(input: CalculateMetricsInput) {
  const { pr, review, reviewComments, allReviews, userGithubLogin } = input;

  const { anchorAt, anchorType, anchorTeamSlug } = computeReviewAnchorAt(input);

  const reviewLatencySeconds = diffSecondsRounded(anchorAt, review.submittedAt);

  const nonAuthorReviews = allReviews
    .filter(
      (r) =>
        r.reviewerGithubLogin !== pr.authorGithubLogin &&
        r.submittedAt &&
        r.submittedAt >= anchorAt,
    )
    .sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime());

  const first = nonAuthorReviews[0];
  const wasFirstReview = !!first && first.id === review.id;

  return {
    githubReviewId: review.id,
    tenantId: review.tenantId,

    githubPrId: review.prId,
    prNumber: pr.prNumber,
    repoFullName: pr.repoFullName,
    prAuthorLogin: pr.authorGithubLogin,

    reviewerLogin: review.reviewerGithubLogin,
    reviewerIsTenant: review.reviewerGithubLogin === userGithubLogin,

    state: normState(review.state),
    submittedAt: review.submittedAt,
    commitId: review.commitId,
    htmlUrl: review.htmlUrl,
    body: review.body,

    reviewLatencySeconds,
    reviewAnchorAt: anchorAt,
    reviewAnchorType: anchorType,
    anchorTeamSlug: anchorTeamSlug,

    isApproval: normState(review.state) === "approved",
    isChangeRequest: normState(review.state) === "changes_requested",
    isCommentOnly: normState(review.state) === "commented",
    reviewCommentsCount: reviewComments.length,

    wasDirectlyRequested: anchorType === "direct_request",
    wasFirstReview,

    normalizedAt: new Date(),
    normalizationVersion: 1,
  };
}

type AnchorType =
  | "direct_request"
  | "team_request"
  | "ready_for_review"
  | "first_request_in_cycle"
  | "cycle_start"
  | "pr_open";

export function computeReviewAnchorAt({
  pr,
  timeline,
  review,
  inferredTeamSlug,
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
      e.eventType === "review_requested" &&
      e.requestedTargetType === "user" &&
      e.requestedReviewerLogin === review.reviewerGithubLogin,
  );
  if (directReq) {
    const laterRemoval = lastBefore(
      events,
      cutoff,
      (e) =>
        e.createdAt >= directReq.createdAt &&
        e.createdAt <= cycle.end &&
        e.eventType === "review_request_removed" &&
        e.requestedTargetType === "user" &&
        e.requestedReviewerLogin === review.reviewerGithubLogin,
    );

    const requestStillActive = !laterRemoval;
    if (requestStillActive) {
      return {
        anchorAt: directReq.createdAt,
        anchorType: "direct_request",
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
      e.eventType === "review_requested" &&
      e.requestedTargetType === "team" &&
      (!inferredTeamSlug || e.requestedTeamSlug === inferredTeamSlug),
  );
  if (teamReq) {
    const laterRemoval = lastBefore(
      events,
      cutoff,
      (e) =>
        e.createdAt >= teamReq.createdAt &&
        e.createdAt <= cycle.end &&
        e.eventType === "review_request_removed" &&
        e.requestedTargetType === "team" &&
        e.requestedTeamSlug === teamReq.requestedTeamSlug,
    );

    const requestStillActive = !laterRemoval;
    if (requestStillActive) {
      return {
        anchorAt: teamReq.createdAt,
        anchorType: "team_request",
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
      e.eventType === "ready_for_review",
  );
  if (ready) {
    return {
      anchorAt: ready.createdAt,
      anchorType: "ready_for_review",
      anchorTeamSlug: null,
    };
  }

  // Otherwise, use any generic review request
  const anyReq = events.find(
    (e) =>
      e.createdAt >= cycle.start &&
      e.createdAt <= cycle.end &&
      e.createdAt <= cutoff &&
      e.eventType === "review_requested",
  );
  if (anyReq) {
    return {
      anchorAt: anyReq.createdAt,
      anchorType: "first_request_in_cycle",
      anchorTeamSlug: anyReq.requestedTeamSlug ?? null,
    };
  }

  // finnlly, fall back to start of cycle or pr open
  const isPrOpen = cycle.start.getTime() === pr.createdAt.getTime();
  return {
    anchorAt: cycle.start,
    anchorType: isPrOpen ? "pr_open" : "cycle_start",
    anchorTeamSlug: null,
  };
}
