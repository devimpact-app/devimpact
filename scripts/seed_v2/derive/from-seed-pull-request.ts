import { randomUUID } from 'crypto';
import type { InferInsertModel } from 'drizzle-orm';
import type {
  pullRequests,
  prSummaries,
} from '@/lib/db/schema/github-normalized';
import { SeedPullRequest } from '../schema/seedPullRequest';
import { dateForDayIndex, SeedTimeContext } from '../helpers';
import { addMinutes } from 'date-fns';
import { getSecondsDiff } from '@/lib/utils/date';
import { NewGithubPR } from '@/lib/db/schema';

type NewPullRequest = InferInsertModel<typeof pullRequests>;
type NewPrSummary = InferInsertModel<typeof prSummaries>;

export type SeedPRConvertContext = {
  tenantId: string;
  githubUsername: string;
  timeCtx: SeedTimeContext;
};

export function seedPullRequestToDbRows(
  seed: SeedPullRequest,
  ctx: SeedPRConvertContext
): { githubPr: NewGithubPR; pr: NewPullRequest; summary: NewPrSummary } {
  const now = ctx.timeCtx.now;
  const rng = Math.random;

  const prId = randomUUID();
  const githubPrId = randomUUID();

  const repoFullName = seed.repo;
  const prNumber = seed.number;

  const createdAt = dateForDayIndex(ctx.timeCtx, seed.dayIndex, seed.time);

  const mergedAt =
    seed.state === 'merged'
      ? addMinutes(
          createdAt,
          pickMergeDelayMinutes(seed.size, seed.reviewIntensity, rng)
        )
      : null;

  const closedAt =
    seed.state === 'closed'
      ? addMinutes(createdAt, pickCloseDelayMinutes(seed.size, rng))
      : seed.state === 'merged'
        ? mergedAt
        : null;

  const state = seed.state;
  const prUpdatedAt = mergedAt ?? closedAt ?? now;
  const size = seed.size;
  const intensity = seed.reviewIntensity;

  const { linesChanged, filesChanged, commitsCount } = derivePRShape(size, rng);
  const {
    reviewsCount,
    uniqueReviewers,
    approvalsCount,
    changesRequestedCount,
    reviewRounds,
  } = deriveReviewProcess(intensity, rng);

  const touchedTests = !!seed.touchedTests;
  const testFilesChanged = touchedTests
    ? randInt(rng, 1, Math.max(1, Math.floor(filesChanged / 3)))
    : 0;

  const linesAdded = Math.floor(linesChanged * randFloat(rng, 0.55, 0.75));
  const linesDeleted = Math.max(0, linesChanged - linesAdded);

  const largestFileChanged = Math.max(
    1,
    Math.floor(linesChanged * randFloat(rng, 0.25, 0.6))
  );
  const avgChangesPerFile =
    filesChanged > 0 ? linesChanged / filesChanged : linesChanged;

  const hadForcePushes = intensity === 'heavy' ? rng() < 0.35 : rng() < 0.12;
  const wasApprovedBeforeMerge =
    seed.state === 'merged' ? approvalsCount > 0 : false;

  const firstCommitAt = addMinutes(createdAt, randInt(rng, 0, 45));
  const lastReadyForReviewAt = addMinutes(createdAt, randInt(rng, 60, 6 * 60)); // 1–6h in
  const firstReviewAtForCycle =
    intensity === 'light'
      ? addMinutes(lastReadyForReviewAt, randInt(rng, 30, 4 * 60))
      : intensity === 'normal'
        ? addMinutes(lastReadyForReviewAt, randInt(rng, 60, 8 * 60))
        : addMinutes(lastReadyForReviewAt, randInt(rng, 2 * 60, 18 * 60));

  const authoringLeadSeconds = getSecondsDiff(
    firstCommitAt,
    lastReadyForReviewAt
  );
  const timeToFirstReviewSeconds = getSecondsDiff(
    lastReadyForReviewAt,
    firstReviewAtForCycle
  );
  const reviewToMergeSeconds = mergedAt
    ? getSecondsDiff(firstReviewAtForCycle, mergedAt)
    : null;
  const leadTimeSeconds = mergedAt
    ? getSecondsDiff(firstCommitAt, mergedAt)
    : null;

  const timeToFirstApprovalSeconds =
    approvalsCount > 0 && mergedAt
      ? getSecondsDiff(
          lastReadyForReviewAt,
          addMinutes(lastReadyForReviewAt, randInt(rng, 60, 24 * 60))
        )
      : null;

  const htmlUrl = buildFakePrUrl(repoFullName, prNumber);

  const [repoOwner, repoName] = repoFullName.split('/');
  if (!repoOwner || !repoName) {
    throw new Error(
      `Invalid repoFullName "${repoFullName}" (expected "owner/name")`
    );
  }

  const githubState: 'open' | 'closed' =
    seed.state === 'open' ? 'open' : 'closed';
  const githubPr: NewGithubPR = {
    id: githubPrId,
    tenantId: ctx.tenantId,
    externalId: `seed:${repoFullName}#${prNumber}`,
    prNumber,
    repoFullName,
    repoOwner,
    repoName,
    title: seed.title,
    body: null,
    state: githubState,
    draft: false,
    authorGithubLogin: ctx.githubUsername,
    createdAt,
    updatedAt: prUpdatedAt,
    closedAt: githubState === 'closed' ? (closedAt ?? null) : null,
    htmlUrl,
    fetchedAt: now,
  };

  const pr: NewPullRequest = {
    id: prId,
    githubPrId,
    tenantId: ctx.tenantId,

    prNumber,
    repoFullName,
    title: seed.title,
    state,
    prAuthorLogin: ctx.githubUsername,
    htmlUrl,
    body: '', // seed can leave empty; could later use summary.long as body
    authorIsTenant: true,

    createdAt,
    mergedAt,
    closedAt,
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

    filesAdded: randInt(rng, 0, Math.min(3, filesChanged)),
    filesModified: Math.max(0, filesChanged - 1),
    filesDeleted: randInt(rng, 0, 1),
    filesRenamed: randInt(rng, 0, 1),

    touchedTests,
    testFilesChanged,

    largestFileChanged,
    avgChangesPerFile,
    commitsCount,
    reviewsCount,
    uniqueReviewers,
    selfReviewCommentsCount: randInt(rng, 0, intensity === 'heavy' ? 6 : 3),
    reviewCommentsCount: randInt(
      rng,
      intensity === 'light' ? 0 : 2,
      intensity === 'heavy' ? 20 : 10
    ),

    approvalsCount,
    changesRequestedCount,
    blockingReviewCount:
      intensity === 'heavy' ? randInt(rng, 0, 2) : randInt(rng, 0, 1),
    nonBlockingReviewCount: Math.max(0, reviewsCount - 1),
    reviewRounds,

    wasApprovedBeforeMerge,
    hadForcePushes,

    normalizedAt: now,
    sourceUpdatedAt: prUpdatedAt,
    normalizationVersion: 1,
  };

  const s = seed.summary;

  const summary: NewPrSummary = {
    id: randomUUID(),
    tenantId: ctx.tenantId,
    prId: prId,
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
    createdAt: now,
    updatedAt: now,
  };

  return { githubPr, pr, summary };
}

function randInt(rng: () => number, min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function randFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

function derivePRShape(
  size: 'small' | 'medium' | 'large',
  rng: () => number
): { linesChanged: number; filesChanged: number; commitsCount: number } {
  if (size === 'small') {
    return {
      linesChanged: randInt(rng, 40, 180),
      filesChanged: randInt(rng, 2, 8),
      commitsCount: randInt(rng, 1, 5),
    };
  }
  if (size === 'medium') {
    return {
      linesChanged: randInt(rng, 180, 650),
      filesChanged: randInt(rng, 6, 18),
      commitsCount: randInt(rng, 3, 12),
    };
  }
  return {
    linesChanged: randInt(rng, 650, 2200),
    filesChanged: randInt(rng, 12, 45),
    commitsCount: randInt(rng, 6, 25),
  };
}

function deriveReviewProcess(
  intensity: 'light' | 'normal' | 'heavy',
  rng: () => number
): {
  reviewsCount: number;
  uniqueReviewers: number;
  approvalsCount: number;
  changesRequestedCount: number;
  reviewRounds: number;
} {
  if (intensity === 'light') {
    const reviewers = randInt(rng, 1, 2);
    const reviews = randInt(rng, 1, 2);
    return {
      reviewsCount: reviews,
      uniqueReviewers: reviewers,
      approvalsCount: randInt(rng, 1, 2),
      changesRequestedCount: rng() < 0.2 ? 1 : 0,
      reviewRounds: randInt(rng, 1, 2),
    };
  }

  if (intensity === 'normal') {
    const reviewers = randInt(rng, 2, 4);
    const reviews = randInt(rng, 2, 5);
    return {
      reviewsCount: reviews,
      uniqueReviewers: reviewers,
      approvalsCount: randInt(rng, 1, 3),
      changesRequestedCount: rng() < 0.35 ? 1 : 0,
      reviewRounds: randInt(rng, 1, 3),
    };
  }

  // heavy
  const reviewers = randInt(rng, 3, 6);
  const reviews = randInt(rng, 4, 10);
  return {
    reviewsCount: reviews,
    uniqueReviewers: reviewers,
    approvalsCount: randInt(rng, 1, 4),
    changesRequestedCount: randInt(rng, 1, 3),
    reviewRounds: randInt(rng, 2, 5),
  };
}

function pickMergeDelayMinutes(
  size: 'small' | 'medium' | 'large',
  intensity: 'light' | 'normal' | 'heavy',
  rng: () => number
): number {
  // This is “time from createdAt to mergedAt” in seed world.
  // It’s not perfect realism, but good enough to make the UI feel alive.
  const base =
    size === 'small'
      ? randInt(rng, 120, 8 * 60)
      : size === 'medium'
        ? randInt(rng, 6 * 60, 2 * 24 * 60)
        : randInt(rng, 1 * 24 * 60, 6 * 24 * 60);

  const intensityBump =
    intensity === 'light'
      ? randInt(rng, -120, 240)
      : intensity === 'normal'
        ? randInt(rng, 0, 720)
        : randInt(rng, 240, 2 * 24 * 60);

  return Math.max(60, base + intensityBump);
}

function pickCloseDelayMinutes(
  size: 'small' | 'medium' | 'large',
  rng: () => number
): number {
  return size === 'small'
    ? randInt(rng, 60, 8 * 60)
    : size === 'medium'
      ? randInt(rng, 6 * 60, 2 * 24 * 60)
      : randInt(rng, 1 * 24 * 60, 4 * 24 * 60);
}

function buildFakePrUrl(repoFullName: string, prNumber: number): string {
  return `https://github.com/${repoFullName}/pull/${prNumber}`;
}
