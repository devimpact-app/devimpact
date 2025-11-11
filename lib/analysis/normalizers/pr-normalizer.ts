import { db } from "@/lib/db/client";
import {
  githubPrs,
  githubPrCommits,
  githubReviews,
  githubReviewComments,
  githubTimelineEvents,
  githubPrFiles,
  GithubPR,
  GithubTimelineEvent,
  GithubPRFile,
  GithubPRCommit,
  GithubReview,
  GithubReviewComment,
} from "@/lib/db/schema/github-raw";
import { pullRequests } from "@/lib/db/schema/github-normalized";
import { eq, and, inArray } from "drizzle-orm";
import { diffSecondsRounded, groupBy } from "./helpers";

export async function batchNormalizeUserPRs(
  userId: string,
  username: string,
): Promise<number> {
  // 1. Get all PRs for user
  const prs = await db
    .select()
    .from(githubPrs)
    .where(eq(githubPrs.tenantId, userId));

  if (prs.length === 0) return 0;

  console.log(`Normalizing ${prs.length} PRs for user ${userId}`);

  const prIds = prs.map((pr) => pr.id);

  // 2. Fetch ALL related data in one go (5 queries, not 5 * N)
  console.log("Fetching related data...");
  const [allFiles, allCommits, allReviews, allReviewComments, allTimeline] =
    await Promise.all([
      db.select().from(githubPrFiles).where(inArray(githubPrFiles.prId, prIds)),
      db
        .select()
        .from(githubPrCommits)
        .where(inArray(githubPrCommits.prId, prIds)),
      db.select().from(githubReviews).where(inArray(githubReviews.prId, prIds)),
      db
        .select()
        .from(githubReviewComments)
        .where(inArray(githubReviewComments.prId, prIds)),
      db
        .select()
        .from(githubTimelineEvents)
        .where(inArray(githubTimelineEvents.prId, prIds)),
    ]);

  console.log(
    `Fetched: ${allFiles.length} files, ${allCommits.length} commits, ${allReviews.length} reviews`,
  );

  // 3. Group by PR ID
  const filesByPrId = groupBy(allFiles, "prId");
  const commitsByPrId = groupBy(allCommits, "prId");
  const reviewsByPrId = groupBy(allReviews, "prId");
  const commentsByPrId = groupBy(allReviewComments, "prId");
  const timelineByPrId = groupBy(allTimeline, "prId");

  // 4. Calculate metrics for all PRs (in memory)
  console.log("Calculating metrics...");
  const normalizedData = prs.map((pr) => {
    return calculateMetrics({
      pr,
      timeline: timelineByPrId[pr.id] || [],
      userCommits: (commitsByPrId[pr.id] || []).filter(
        (c) => c.authorGithubLogin === username,
      ),
      reviews: reviewsByPrId[pr.id] || [],
      reviewComments: commentsByPrId[pr.id] || [],
      userGithubLogin: username,
      prFiles: filesByPrId[pr.id] || [],
    });
  });

  // 5. Batch upsert
  console.log("Saving normalized data...");
  const existingPRs = await db
    .select({ githubPrId: pullRequests.githubPrId })
    .from(pullRequests)
    .where(
      inArray(
        pullRequests.githubPrId,
        normalizedData.map((d) => d.githubPrId),
      ),
    );

  const existingIds = new Set(existingPRs.map((pr) => pr.githubPrId));

  // Split
  const toInsert = normalizedData.filter((d) => !existingIds.has(d.githubPrId));
  const toUpdate = normalizedData.filter((d) => existingIds.has(d.githubPrId));

  // Batch insert new
  if (toInsert.length > 0) {
    await db.insert(pullRequests).values(toInsert);
  }

  // Update existing (loop is fine, it's fast)
  for (const data of toUpdate) {
    const { githubPrId, tenantId, ...updateFields } = data;
    await db
      .update(pullRequests)
      .set(updateFields)
      .where(eq(pullRequests.githubPrId, githubPrId));
  }

  console.log(`✓ Normalized ${normalizedData.length} PRs`);
  return normalizedData.length;
}

interface CalculateMetricsInput {
  pr: GithubPR;
  timeline: GithubTimelineEvent[];
  prFiles: GithubPRFile[];
  userCommits: GithubPRCommit[];
  reviews: GithubReview[];
  reviewComments: GithubReviewComment[];
  userGithubLogin: string;
}

function calculateMetrics(input: CalculateMetricsInput) {
  const {
    pr,
    timeline,
    prFiles,
    userCommits,
    reviews,
    reviewComments,
    userGithubLogin,
  } = input;

  // Find merged_at from timeline
  const mergeEvent = timeline.find((e) => e.eventType === "merged");
  const mergedAt = mergeEvent?.createdAt || null;

  // Determine state
  const state = pr.state === "closed" && mergedAt ? "merged" : pr.state;

  // Calculate code metrics (user's commits only)
  const linesAdded = prFiles.reduce((sum, f) => sum + f.additions, 0);
  const linesDeleted = prFiles.reduce((sum, f) => sum + f.deletions, 0);
  const linesChanged = linesAdded + linesDeleted;
  const filesChanged = prFiles.length;

  const filesAdded = prFiles.filter((f) => f.status === "added").length;
  const filesModified = prFiles.filter((f) => f.status === "modified").length;
  const filesDeleted = prFiles.filter((f) => f.status === "deleted").length;
  const filesRenamed = prFiles.filter((f) => f.status === "renamed").length;

  // Test coverage
  const testFiles = prFiles.filter((f) => f.isTestFile);
  const touchedTests = testFiles.length > 0;
  const testFilesChanged = testFiles.length;

  // Complexity indicators
  const largestFileChanged =
    prFiles.length > 0 ? Math.max(...prFiles.map((f) => f.changes)) : 0;

  const avgChangesPerFile = filesChanged > 0 ? linesChanged / filesChanged : 0;

  // Commit count
  const commitsCount = userCommits.length;

  // Calculate review metrics
  const uniqueReviewers = new Set(reviews.map((r) => r.reviewerGithubLogin))
    .size;
  const approvalsCount = reviews.filter((r) => r.state === "APPROVED").length;
  const changesRequestedCount = reviews.filter(
    (r) => r.state === "CHANGES_REQUESTED",
  ).length;

  // Was it approved before merge?
  const wasApprovedBeforeMerge = mergedAt
    ? reviews.some(
        (r) =>
          r.state === "APPROVED" && r.submittedAt && r.submittedAt < mergedAt,
      )
    : false;

  // Calculate review rounds
  const reviewRounds = calculateReviewRounds(
    reviews,
    userCommits,
    userGithubLogin,
  );

  const hadForcePushes = timeline.some(
    (e) => e.eventType === "head_ref_force_pushed",
  );

  // Data availability flags
  const hadTimelineData = timeline.length > 0;
  const hadReviewData = reviews.length > 0;
  const hadCommitData = userCommits.length > 0;

  // Timeline
  const validCommitTimes = userCommits
    .map((c) => (c.committedAt ? new Date(c.committedAt).getTime() : null))
    .filter((t): t is number => t !== null && !isNaN(t));
  const firstCommitAt = validCommitTimes.length
    ? new Date(Math.min(...validCommitTimes))
    : pr.createdAt;
  const { readyAt: lastReadyForReviewAt } = computeReadyAnchor({
    pr,
    timeline,
  });
  const reviewsAfterLastReady = reviews
    .filter(
      (r) =>
        r.submittedAt! >= lastReadyForReviewAt &&
        r.submittedAt! <= (pr.closedAt ?? new Date()),
    )
    .filter((r) => r.reviewerGithubLogin !== pr.authorGithubLogin)
    .sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime());
  const approvalsAfterLastReady = reviewsAfterLastReady.filter(
    (r) => r.state.toLowerCase() === "approved",
  );
  const firstReviewAtForCycle =
    reviewsAfterLastReady.length > 0
      ? (reviewsAfterLastReady[0].submittedAt ?? null)
      : null;
  const firstApprovalAtAfterCycle =
    approvalsAfterLastReady.length > 0
      ? (approvalsAfterLastReady[0].submittedAt ?? null)
      : null;

  const authoringLeadSeconds = diffSecondsRounded(
    firstCommitAt,
    lastReadyForReviewAt,
  );
  const timeToFirstReviewSeconds = diffSecondsRounded(
    lastReadyForReviewAt,
    firstReviewAtForCycle,
  );
  const reviewToMergeSeconds = diffSecondsRounded(
    firstReviewAtForCycle,
    mergedAt,
  );
  const leadTimeSeconds = diffSecondsRounded(firstCommitAt, mergedAt);
  const timeToFirstApprovalSeconds = diffSecondsRounded(
    lastReadyForReviewAt,
    firstApprovalAtAfterCycle,
  );

  return {
    githubPrId: pr.id,
    tenantId: pr.tenantId,
    prNumber: pr.prNumber,
    repoFullName: pr.repoFullName,
    title: pr.title,
    state,
    htmlUrl: pr.htmlUrl,
    body: pr.body,
    prAuthorLogin: pr.authorGithubLogin,

    createdAt: pr.createdAt,
    mergedAt,
    closedAt: pr.closedAt,
    firstCommitAt,
    lastReadyForReviewAt,
    firstReviewAtForCycle,

    authoringLeadSeconds,
    timeToFirstReviewSeconds,
    reviewToMergeSeconds,
    leadTimeSeconds,
    timeToFirstApprovalSeconds,

    linesAdded,
    linesDeleted,
    linesChanged,
    filesChanged,
    filesAdded,
    filesModified,
    filesDeleted,
    filesRenamed,
    touchedTests,
    testFilesChanged,
    largestFileChanged,
    avgChangesPerFile,
    commitsCount,

    reviewsCount: reviews.length,
    uniqueReviewers,
    reviewCommentsCount: reviewComments.length,
    approvalsCount,
    changesRequestedCount,
    reviewRounds,
    wasApprovedBeforeMerge,

    hadForcePushes,

    hadTimelineData,
    hadReviewData,
    hadCommitData,

    normalizedAt: new Date(),
    normalizationVersion: 1,
  };
}

export function computeReadyAnchor(opts: {
  pr: GithubPR;
  timeline: GithubTimelineEvent[];
}): {
  readyAt: Date; // authoritative “ready” for the PR
  firstReadyEventAt?: Date; // earliest ready/review_requested ever
  cycles: Array<{ start: Date; end: Date }>;
} {
  const { pr, timeline } = opts;
  const endAt = pr.closedAt ?? new Date();

  // all timeline events sorted
  const events = timeline
    .filter((e) => e && e.createdAt && e.createdAt <= endAt)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Draft timestamps
  const draftCuts = events
    .filter((e) => e.eventType === "convert_to_draft")
    .map((e) => e.createdAt);

  // Cycles - PR created, draft conversions, end of PR
  const cycleStarts: Date[] = [pr.createdAt, ...draftCuts];
  const cycles = cycleStarts.map((start, i) => ({
    start,
    end: i < draftCuts.length ? draftCuts[i] : endAt,
  }));

  // Sort all ready events
  const allReadyish = events
    .filter(
      (e) =>
        e.eventType === "ready_for_review" ||
        e.eventType === "review_requested",
    )
    .map((e) => e.createdAt)
    .sort((a, b) => a.getTime() - b.getTime());

  // Get ready event after last cycle (PR open or last draft conversion)
  const last = cycles[cycles.length - 1];
  const readyInLast = events
    .filter(
      (e) =>
        (e.eventType === "ready_for_review" ||
          e.eventType === "review_requested") &&
        e.createdAt >= last.start &&
        e.createdAt <= last.end,
    )
    .map((e) => e.createdAt)
    .sort((a, b) => a.getTime() - b.getTime());

  // Decision tree
  if (readyInLast.length > 0) {
    return {
      readyAt: readyInLast[0],
      firstReadyEventAt: allReadyish[0],
      cycles,
    };
  }

  // If there have never been any ready-ish events, use PR creation
  if (allReadyish.length === 0) {
    return {
      readyAt: pr.createdAt,
      firstReadyEventAt: undefined,
      cycles,
    };
  }

  // Otherwise fallback to earliest ready-ish seen anywhere (incomplete timeline)
  return {
    readyAt: allReadyish[0],
    firstReadyEventAt: allReadyish[0],
    cycles,
  };
}

function calculateReviewRounds(
  reviews: any[],
  prCommits: any[],
  authorLogin: string,
): number {
  if (reviews.length === 0) return 0;

  const authorCommits = prCommits.filter((c) => c.authorLogin === authorLogin);

  // Create timeline of events
  const events = [
    ...reviews.map((r) => ({ type: "review", time: r.submittedAt })),
    ...authorCommits.map((c) => ({ type: "commit", time: c.committedAt })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  let rounds = 0;
  let lastEventType: string | null = null;

  for (const event of events) {
    if (event.type === "commit" && lastEventType === "review") {
      rounds++;
    }
    lastEventType = event.type;
  }

  return rounds;
}
