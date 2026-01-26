import { randomUUID } from 'crypto';
import {
  dateForDayIndex,
  deterministicGithubPrId,
  deterministicGithubReviewId,
  deterministicPullRequestId,
  randFloat,
  randInt,
  SeedTimeContext,
} from '../helpers';
import { SeedReview } from '../schema/seedReview';
import {
  NewGithubPR,
  NewGithubReview,
  NewPrSummary,
  NewPullRequest,
  NewReview,
} from '@/lib/db/schema';
import {
  buildFakePrUrl,
  derivePRShape,
  pickMergeDelayMinutes,
} from './from-seed-pull-request';
import { getSecondsDiff } from '@/lib/utils/date';
import { addDays, addMinutes, subMinutes } from 'date-fns';

type SeedReviewConvertContext = {
  tenantId: string;
  githubUsername: string;
  timeCtx: SeedTimeContext;
};

export function seedReviewToDbRows(
  seed: SeedReview,
  ctx: SeedReviewConvertContext
): {
  githubPr: NewGithubPR;
  pr: NewPullRequest;
  prSummary: NewPrSummary;
  githubReview: NewGithubReview;
  review: NewReview;
} {
  const rng = Math.random;

  const repoFullName = seed.target.repo;
  const prNumber = seed.target.number;

  const githubPrId = deterministicGithubPrId(
    ctx.tenantId,
    repoFullName,
    prNumber
  );
  const prId = deterministicPullRequestId(ctx.tenantId, repoFullName, prNumber);
  const prSummaryId = randomUUID();

  const submittedAt = dateForDayIndex(ctx.timeCtx, seed.dayIndex, seed.time);
  const prCreatedAt = addDays(submittedAt, -randInt(rng, 1, 6));
  const prUpdatedAt = submittedAt;
  const prMergedAt = addMinutes(
    prCreatedAt,
    pickMergeDelayMinutes(seed.target.prContext.size, 'normal', rng)
  );

  const [repoOwner, repoName] = splitRepo(repoFullName);
  const githubPr: NewGithubPR = {
    id: githubPrId,
    tenantId: ctx.tenantId,
    externalId: `seed_pr_${repoOwner}_${repoName}_${prNumber}`, // stable-ish
    prNumber,
    repoFullName,
    repoOwner,
    repoName,
    title: seed.target.prContext.title,
    body: null,
    state: 'closed',
    draft: false,
    authorGithubLogin: seed.target.author,
    createdAt: prCreatedAt,
    updatedAt: prUpdatedAt,
    closedAt: prMergedAt,
    htmlUrl: buildFakePrUrl(repoFullName, prNumber),
    fetchedAt: ctx.timeCtx.now,
  };

  const size = seed.target.prContext.size;
  const { linesChanged, filesChanged, commitsCount } = derivePRShape(size, rng);

  const touchedTests = seed.target.prContext.touchedTests;
  const testFilesChanged = touchedTests
    ? randInt(rng, 1, Math.max(1, Math.floor(filesChanged / 3)))
    : 0;

  const linesAdded = Math.floor(linesChanged * randFloat(rng, 0.55, 0.8));
  const linesDeleted = Math.max(0, linesChanged - linesAdded);

  const firstCommitAt = addMinutes(prCreatedAt, randInt(rng, 10, 90));
  const lastReadyForReviewAt = addMinutes(
    prCreatedAt,
    randInt(rng, 60, 8 * 60)
  );
  const firstReviewAtForCycle = submittedAt;

  const authoringLeadSeconds = getSecondsDiff(
    firstCommitAt,
    lastReadyForReviewAt
  );
  const timeToFirstReviewSeconds = getSecondsDiff(
    lastReadyForReviewAt,
    firstReviewAtForCycle
  );
  const reviewToMergeSeconds = prMergedAt
    ? getSecondsDiff(firstReviewAtForCycle, prMergedAt)
    : null;
  const leadTimeSeconds = prMergedAt
    ? getSecondsDiff(firstCommitAt, prMergedAt)
    : null;

  const pr: NewPullRequest = {
    id: prId,
    githubPrId,
    tenantId: ctx.tenantId,
    prNumber,
    repoFullName,
    title: seed.target.prContext.title,
    state: 'merged',
    prAuthorLogin: seed.target.author,
    htmlUrl: buildFakePrUrl(repoFullName, prNumber),
    body: '',
    authorIsTenant: false,
    createdAt: prCreatedAt,
    mergedAt: null,
    closedAt: null,
    firstCommitAt,
    lastReadyForReviewAt,
    firstReviewAtForCycle,
    authoringLeadSeconds,
    timeToFirstReviewSeconds,
    reviewToMergeSeconds,
    leadTimeSeconds,
    timeToFirstApprovalSeconds: null,
    linesAdded,
    linesDeleted,
    linesChanged,
    filesChanged,
    filesAdded: randInt(rng, 0, Math.min(2, filesChanged)),
    filesModified: Math.max(0, filesChanged - 1),
    filesDeleted: randInt(rng, 0, 1),
    filesRenamed: randInt(rng, 0, 1),
    touchedTests,
    testFilesChanged,
    largestFileChanged: Math.max(
      1,
      Math.floor(linesChanged * randFloat(rng, 0.25, 0.6))
    ),
    avgChangesPerFile:
      filesChanged > 0 ? linesChanged / filesChanged : linesChanged,
    commitsCount,
    reviewsCount: 0,
    uniqueReviewers: 0,
    selfReviewCommentsCount: 0,
    reviewCommentsCount: 0,
    approvalsCount: 0,
    changesRequestedCount: 0,
    blockingReviewCount: 0,
    nonBlockingReviewCount: 0,
    reviewRounds: 0,
    wasApprovedBeforeMerge: false,
    hadForcePushes: false,
    normalizedAt: ctx.timeCtx.now,
    sourceUpdatedAt: prUpdatedAt,
    normalizationVersion: 1,
  };

  const s = seed.target.prContext.summary;
  const prSummary: NewPrSummary = {
    id: prSummaryId,
    tenantId: ctx.tenantId,
    prId,
    repoFullName,
    prNumber,
    shortSummary: s.short,
    longSummary: null,
    highlights: s.highlights ?? [],
    typeTags: s.typeTags ?? [],
    domainTags: s.domainTags ?? [],
    reviewFrictionTags: [],
    inputHash: null,
    model: 'seed',
    promptVersion: 'seed_v1',
    prUpdatedAt,
    createdAt: ctx.timeCtx.now,
    updatedAt: ctx.timeCtx.now,
  };

  const githubReviewId = deterministicGithubReviewId(
    ctx.tenantId,
    repoFullName,
    prNumber,
    seed.dayIndex,
    seed.state
  );
  const reviewId = `seed_review_${repoOwner}_${repoName}_${prNumber}_${seed.dayIndex}_${seed.time.replace(':', '')}`;

  const githubReview: NewGithubReview = {
    id: githubReviewId,
    prId: githubPrId,
    tenantId: ctx.tenantId,
    reviewId,
    state: seed.state,
    body: seed.bodyHint,
    reviewerGithubLogin: ctx.githubUsername,
    prAuthorGithubLogin: seed.target.author,
    commitId: null,
    authorAssociation: 'MEMBER',
    submittedAt,
    htmlUrl: buildFakeReviewUrl(repoFullName, prNumber, reviewId),
    fetchedAt: ctx.timeCtx.now,
  };

  const isApproval = seed.state === 'APPROVED';
  const isChangeRequest = seed.state === 'CHANGES_REQUESTED';
  const isCommentOnly = seed.state === 'COMMENTED';
  const reviewAnchorAt = pickAnchorAt(submittedAt, seed.anchorType, rng);
  const reviewLatencySeconds = Math.max(
    0,
    getSecondsDiff(reviewAnchorAt, submittedAt)
  );

  const review: NewReview = {
    id: randomUUID(),
    githubReviewId: githubReviewId,
    tenantId: ctx.tenantId,
    prId: prId,
    prNumber,
    repoFullName,
    prAuthorLogin: seed.target.author,
    reviewerLogin: ctx.githubUsername,
    reviewerIsTenant: true,
    state: seed.state,
    submittedAt,
    commitId: null,
    htmlUrl: buildFakeReviewUrl(repoFullName, prNumber, reviewId),
    body: seed.bodyHint ?? '',
    reviewLatencySeconds,
    reviewAnchorAt,
    reviewAnchorType: seed.anchorType, // keep raw for now (string), matches your schema
    anchorTeamSlug: null,
    isApproval,
    isChangeRequest,
    isCommentOnly,
    wasDirectlyRequested: seed.role.wasDirectlyRequested,
    wasFirstReview: seed.role.wasFirstReview,
    isBlockingReview: seed.role.isBlockingReview,
    isNonBlockingReview: !seed.role.isBlockingReview,
    reviewCommentsCount: seed.commentsCount,
    normalizedAt: ctx.timeCtx.now,
    sourceUpdatedAt: submittedAt,
    normalizationVersion: 1,
  };

  return { githubPr, pr, prSummary, githubReview, review };
}

function splitRepo(full: string): [string, string] {
  const [owner, name] = full.split('/');
  return [owner ?? 'acme', name ?? 'repo'];
}

function pickAnchorAt(
  submittedAt: Date,
  anchorType: string,
  rng: () => number
) {
  const minsEarlier =
    anchorType === 'direct_request'
      ? randInt(rng, 30, 6 * 60)
      : anchorType === 'team_request'
        ? randInt(rng, 60, 12 * 60)
        : randInt(rng, 30, 10 * 60);
  return subMinutes(submittedAt, minsEarlier);
}

function buildFakeReviewUrl(
  repoFullName: string,
  prNumber: number,
  reviewId: string
) {
  return `https://github.com/${repoFullName}/pull/${prNumber}#pullrequestreview-${reviewId}`;
}
