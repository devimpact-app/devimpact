import { db } from '@/lib/db/client';
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
} from '@/lib/db/schema/github-raw';
import { pullRequests } from '@/lib/db/schema/github-normalized';
import { eq, and, inArray, isNull, or, gt, not } from 'drizzle-orm';
import {
  computeCycles,
  diffSecondsRounded,
  firstInCycle,
  groupBy,
  normState,
  readyish,
  sortAndBound,
} from './helpers';

export async function batchNormalizeUserPRs(
  userId: string,
  username: string
): Promise<string[]> {
  const prsNeedingNormalization = await db
    .select({
      raw: githubPrs,
      norm: pullRequests,
    })
    .from(githubPrs)
    .leftJoin(
      pullRequests,
      and(
        eq(githubPrs.tenantId, pullRequests.tenantId),
        eq(githubPrs.id, pullRequests.githubPrId)
      )
    )
    .where(
      and(
        eq(githubPrs.tenantId, userId),
        or(
          isNull(pullRequests.id),
          gt(githubPrs.updatedAt, pullRequests.sourceUpdatedAt)
        )
      )
    );
  console.log('Starting normalization', {
    prsToNormalize: prsNeedingNormalization.length,
    timestamp: new Date().toISOString(),
  });

  if (prsNeedingNormalization.length === 0) return [];

  console.log(
    `Normalizing ${prsNeedingNormalization.length} PRs for user ${userId}`
  );

  const prIds = prsNeedingNormalization.map((pr) => pr.raw.id);

  // Fetch ALL related data in one go (5 queries, not 5 * N)
  console.log('Fetching related data...');
  const [allFiles, allCommits, allReviews, allReviewComments, allTimeline] =
    await Promise.all([
      db.select().from(githubPrFiles).where(inArray(githubPrFiles.prId, prIds)),
      db
        .select()
        .from(githubPrCommits)
        .where(inArray(githubPrCommits.prId, prIds)),
      db
        .select()
        .from(githubReviews)
        .where(
          and(
            inArray(githubReviews.prId, prIds),
            not(
              eq(
                githubReviews.reviewerGithubLogin,
                githubReviews.prAuthorGithubLogin
              )
            )
          )
        ),
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
    `Fetched: ${allFiles.length} files, ${allCommits.length} commits, ${allReviews.length} reviews`
  );

  const filesByPrId = groupBy(allFiles, 'prId');
  const commitsByPrId = groupBy(allCommits, 'prId');
  const reviewsByPrId = groupBy(allReviews, 'prId');
  const commentsByPrId = groupBy(allReviewComments, 'prId');
  const timelineByPrId = groupBy(allTimeline, 'prId');

  console.log('Calculating metrics...');
  const normStartTime = Date.now();
  let processed = 0;
  try {
    await db.transaction(async (tx) => {
      for (const row of prsNeedingNormalization) {
        const pr = row.raw;
        const existingNorm = row.norm;

        const metrics = calculateMetrics({
          pr,
          timeline: timelineByPrId[pr.id] || [],
          userCommits: (commitsByPrId[pr.id] || []).filter(
            (c) => c.authorGithubLogin === username
          ),
          reviews: reviewsByPrId[pr.id] || [],
          reviewComments: commentsByPrId[pr.id] || [],
          userGithubLogin: username,
          prFiles: filesByPrId[pr.id] || [],
        });

        if (!existingNorm) {
          await tx.insert(pullRequests).values(metrics);
          console.log('Inserted normalized PR', {
            prId: pr.id,
            githubPrId: metrics.githubPrId,
          });
        } else {
          const { githubPrId, tenantId, ...updateFields } = metrics;
          await tx
            .update(pullRequests)
            .set(updateFields)
            .where(eq(pullRequests.id, existingNorm.id));

          console.log('Updated normalized PR', { prId: existingNorm.id });
        }
        processed += 1;
      }
    });
  } catch (err) {
    console.error('PR normalization FAILED', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      duration: Date.now() - normStartTime,
    });
    throw err;
  }

  console.log(`✓ Normalized ${processed} PRs`);
  return prIds;
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
  const mergeEvent = timeline.find((e) => e.eventType === 'merged');
  const mergedAt = mergeEvent?.createdAt || null;

  // Determine state
  const state =
    normState(pr.state) === 'closed' && mergedAt
      ? 'merged'
      : normState(pr.state);

  // Calculate code metrics (user's commits only)
  const linesAdded = prFiles.reduce((sum, f) => sum + f.additions, 0);
  const linesDeleted = prFiles.reduce((sum, f) => sum + f.deletions, 0);
  const linesChanged = linesAdded + linesDeleted;
  const filesChanged = prFiles.length;

  const filesAdded = prFiles.filter((f) => f.status === 'added').length;
  const filesModified = prFiles.filter((f) => f.status === 'modified').length;
  const filesDeleted = prFiles.filter((f) => f.status === 'deleted').length;
  const filesRenamed = prFiles.filter((f) => f.status === 'renamed').length;

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
  const approvalsCount = reviews.filter(
    (r) => normState(r.state) === 'approved'
  ).length;
  const changesRequestedCount = reviews.filter(
    (r) => normState(r.state) === 'changes_requested'
  ).length;

  // Was it approved before merge?
  const wasApprovedBeforeMerge = mergedAt
    ? reviews.some(
        (r) =>
          r.state === 'APPROVED' && r.submittedAt && r.submittedAt < mergedAt
      )
    : false;

  const hadForcePushes = timeline.some(
    (e) => e.eventType === 'head_ref_force_pushed'
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
        r.submittedAt &&
        r.submittedAt >= lastReadyForReviewAt &&
        r.submittedAt <= (pr.closedAt ?? new Date())
    )
    .filter((r) => r.reviewerGithubLogin !== pr.authorGithubLogin)
    .sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime());
  const approvalsAfterLastReady = reviewsAfterLastReady.filter(
    (r) => normState(r.state) === 'approved'
  );

  const firstReviewAtForCycle =
    reviewsAfterLastReady.length > 0
      ? (reviewsAfterLastReady[0].submittedAt ?? null)
      : null;
  const firstApprovalAtAfterCycle =
    approvalsAfterLastReady.length > 0
      ? (approvalsAfterLastReady[0].submittedAt ?? null)
      : null;

  const firstApprovalIndex = reviewsAfterLastReady.findIndex(
    (r) => normState(r.state) === 'approved'
  );

  const blockingReviewsAfterReady = reviewsAfterLastReady.filter((r, idx) => {
    const state = normState(r.state);
    if (state === 'changes_requested') return true;

    // COMMENTED before the first approval = effectively blocking
    if (
      state === 'commented' &&
      (firstApprovalIndex === -1 || idx < firstApprovalIndex)
    ) {
      return true;
    }

    return false;
  });

  const nonBlockingReviewsAfterReady = reviewsAfterLastReady.filter(
    (r) => !blockingReviewsAfterReady.includes(r)
  );

  const blockingReviewCount = blockingReviewsAfterReady.length;
  const nonBlockingReviewCount = nonBlockingReviewsAfterReady.length;

  let reviewRounds = 0;
  if (reviewsAfterLastReady.length > 0) {
    // First review round
    reviewRounds = 1;

    // Additional “rounds” are extra blocking reviews after that
    // (CHANGES_REQUESTED or COMMENTED-before-approval)
    const extraBlocking = Math.max(0, blockingReviewCount - 1);
    reviewRounds += extraBlocking;
  }

  const authoringLeadSeconds = diffSecondsRounded(
    firstCommitAt,
    lastReadyForReviewAt
  );
  const timeToFirstReviewSeconds = diffSecondsRounded(
    lastReadyForReviewAt,
    firstReviewAtForCycle
  );
  const reviewToMergeSeconds = diffSecondsRounded(
    firstReviewAtForCycle,
    mergedAt
  );
  const leadTimeSeconds = diffSecondsRounded(firstCommitAt, mergedAt);
  const timeToFirstApprovalSeconds = diffSecondsRounded(
    lastReadyForReviewAt,
    firstApprovalAtAfterCycle
  );

  return {
    githubPrId: pr.id,
    tenantId: pr.tenantId,
    prNumber: pr.prNumber,
    repoFullName: pr.repoFullName,
    title: pr.title,
    state,
    htmlUrl: pr.htmlUrl ?? '',
    body: pr.body ?? '',
    prAuthorLogin: pr.authorGithubLogin,
    authorIsTenant: pr.authorGithubLogin === userGithubLogin,

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
    selfReviewCommentsCount: reviewComments.filter(
      (rc) => rc.authorGithubLogin === pr.authorGithubLogin
    ).length,
    reviewCommentsCount: reviewComments.filter(
      (rc) => rc.authorGithubLogin !== pr.authorGithubLogin
    ).length,
    approvalsCount,
    changesRequestedCount,
    blockingReviewCount,
    nonBlockingReviewCount,
    wasApprovedBeforeMerge,
    reviewRounds,

    hadForcePushes,

    hadTimelineData,
    hadReviewData,
    hadCommitData,

    normalizedAt: new Date(),
    sourceUpdatedAt: pr.updatedAt,
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
  const events = sortAndBound(timeline, endAt);
  // Cycles - PR created, draft conversions, end of PR
  const cycles = computeCycles(pr.createdAt, events, endAt);

  // Sort all ready events
  const firstReadyEvent = events.find(readyish)?.createdAt;

  // Get ready event after last cycle (PR open or last draft conversion)
  const last = cycles[cycles.length - 1];
  const readyInLast = firstInCycle(
    events,
    last.start,
    last.end,
    readyish
  )?.createdAt;

  if (readyInLast) {
    return { readyAt: readyInLast, firstReadyEventAt: firstReadyEvent, cycles };
  }

  if (!firstReadyEvent) {
    return { readyAt: pr.createdAt, cycles };
  }

  // Otherwise fallback to earliest ready-ish seen anywhere (incomplete timeline)
  return {
    readyAt: firstReadyEvent,
    firstReadyEventAt: firstReadyEvent,
    cycles,
  };
}
