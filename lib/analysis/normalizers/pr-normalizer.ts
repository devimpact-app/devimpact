import { db } from "@/lib/db/client";
import {
  githubPrs,
  githubPrCommits,
  githubReviews,
  githubReviewComments,
  githubTimelineEvents,
  githubPrFiles,
} from "@/lib/db/schema/github-raw";
import { pullRequests } from "@/lib/db/schema/github-normalized";
import { eq, and, inArray } from "drizzle-orm";

// Helper: Group array by key
function groupBy<T extends Record<string, any>>(
  array: T[],
  key: keyof T,
): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

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

export async function normalizePullRequest(
  githubPrId: string,
  userGithubLogin: string,
): Promise<void> {
  // 1. Get raw PR data
  const [pr] = await db
    .select()
    .from(githubPrs)
    .where(eq(githubPrs.id, githubPrId))
    .limit(1);

  if (!pr) throw new Error("PR not found");

  // 2. Get timeline events
  const timeline = await db
    .select()
    .from(githubTimelineEvents)
    .where(eq(githubTimelineEvents.prId, githubPrId))
    .orderBy(githubTimelineEvents.createdAt);

  // 3. Get user's commits only
  const userCommits = await db
    .select()
    .from(githubPrCommits)
    .where(and(eq(githubPrCommits.prId, githubPrId)))
    .orderBy(githubPrCommits.committedAt);

  const prFiles = await db
    .select()
    .from(githubPrFiles)
    .where(eq(githubPrFiles.prId, githubPrId));

  // 4. Get reviews
  const reviews = await db
    .select()
    .from(githubReviews)
    .where(eq(githubReviews.prId, githubPrId))
    .orderBy(githubReviews.submittedAt);

  // 5. Get review comments
  const reviewComments = await db
    .select()
    .from(githubReviewComments)
    .where(eq(githubReviewComments.prId, githubPrId));

  // 6. Calculate metrics
  const normalized = calculateMetrics({
    pr,
    timeline,
    userCommits,
    reviews,
    reviewComments,
    userGithubLogin,
    prFiles,
  });

  // 7. Upsert normalized data
  await db.insert(pullRequests).values(normalized).onConflictDoUpdate({
    target: pullRequests.githubPrId,
    set: normalized,
  });
}

interface CalculateMetricsInput {
  pr: any;
  timeline: any[];
  prFiles: any[];
  userCommits: any[];
  reviews: any[];
  reviewComments: any[];
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

  // Calculate timing metrics
  const firstReview = reviews[0];
  const firstReviewAt = firstReview?.submittedAt || null;

  const timeToFirstReview = firstReviewAt
    ? Math.round((firstReviewAt.getTime() - pr.createdAt.getTime()) / 1000)
    : null;

  const timeToMerge = mergedAt
    ? Math.round((mergedAt.getTime() - pr.createdAt.getTime()) / 1000)
    : null;

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
  const uniqueReviewers = new Set(reviews.map((r) => r.reviewerLogin)).size;
  const approvalsCount = reviews.filter((r) => r.state === "APPROVED").length;
  const changesRequestedCount = reviews.filter(
    (r) => r.state === "CHANGES_REQUESTED",
  ).length;

  // Was it approved before merge?
  const wasApprovedBeforeMerge = mergedAt
    ? reviews.some((r) => r.state === "APPROVED" && r.submittedAt < mergedAt)
    : false;

  // Calculate review rounds
  const reviewRounds = calculateReviewRounds(
    reviews,
    userCommits,
    userGithubLogin,
  );

  // Check for merge conflicts and force pushes
  const hadMergeConflicts = timeline.some(
    (e) =>
      e.event === "head_ref_force_pushed" ||
      (e.event === "review_requested" && e.body?.includes("conflict")),
  );

  const hadForcePushes = timeline.some(
    (e) => e.event === "head_ref_force_pushed",
  );

  // Data availability flags
  const hadTimelineData = timeline.length > 0;
  const hadReviewData = reviews.length > 0;
  const hadCommitData = userCommits.length > 0;

  return {
    githubPrId: pr.id,
    tenantId: pr.tenantId,
    prNumber: pr.prNumber,
    repoFullName: pr.repoFullName,
    title: pr.title,
    state,

    createdAt: pr.createdAt,
    mergedAt,
    closedAt: pr.closedAt,
    firstReviewAt,

    timeToFirstReview,
    timeToMerge,

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

    hadMergeConflicts,
    hadForcePushes,

    hadTimelineData,
    hadReviewData,
    hadCommitData,

    normalizedAt: new Date(),
    normalizationVersion: 1,
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
