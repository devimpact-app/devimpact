/* eslint-disable no-console */
import { db as defaultDb } from '@/lib/db/client';
import { githubReviews, githubPrs } from '@/lib/db/schema';
import { InferSelectModel } from 'drizzle-orm';
import { randomTeammates } from './teammates';
import { seedPrReviewComments } from './seedPrReviewComments';

type DB = typeof defaultDb;
type PRRow = InferSelectModel<typeof githubPrs>;

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function makeSha() {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 40; i++) s += hex[rand(0, 15)];
  return s;
}

function reviewState() {
  // Mostly APPROVED, some COMMENTED, occasional CHANGES_REQUESTED
  const r = Math.random();
  if (r < 0.7) return 'APPROVED';
  if (r < 0.92) return 'COMMENTED';
  return 'CHANGES_REQUESTED';
}

function authorAssociation() {
  // Reasonable variety
  return pick(['MEMBER', 'CONTRIBUTOR', 'COLLABORATOR']);
}

function reviewBody(state: string, repo: string) {
  const notes: Record<string, string[]> = {
    APPROVED: [
      'Looks great — nice cleanup.',
      'LGTM, good test coverage.',
      'Solid change; ship it.',
    ],
    COMMENTED: [
      'Left a few comments inline.',
      'Nit: a couple naming suggestions.',
      'Question about error handling path.',
    ],
    CHANGES_REQUESTED: [
      'Please address the concurrency issue.',
      'Needs tests for edge cases before merge.',
      'Let’s split this into smaller PRs.',
    ],
  };
  const arr = notes[state] ?? ['Looks good.'];
  return `${pick(arr)} (${repo})`;
}

function fakeReviewId(repoFullName: string, prNumber: number) {
  // Stable-ish, unique text id for seeds (schema wants text)
  const base = Buffer.from(`${repoFullName}#${prNumber}`)
    .toString('base64')
    .replace(/=/g, '');
  // Add short random to avoid collisions across re-runs
  return `seed_review_${base}_${rand(10000, 99999)}`;
}

/**
 * Seed a single review for a PR. Upserts on unique(review_id).
 */
export async function seedPrReview(params: {
  db?: DB;
  pr: PRRow;
  tenantId: string;
  reviewerGithubLogin?: string;
  prAuthorGithubLogin: string;
  prNumber: number;
  repoFullName: string;
  submittedAt: Date;
  preferredState?: 'APPROVED' | 'COMMENTED' | 'CHANGES_REQUESTED';
  inlineCommentProbabilityOverride?: number;
}) {
  const db = params.db ?? defaultDb;
  const {
    pr,
    tenantId,
    reviewerGithubLogin,
    prAuthorGithubLogin,
    prNumber,
    repoFullName,
    submittedAt,
    preferredState,
    inlineCommentProbabilityOverride,
  } = params;

  const state = preferredState ?? reviewState();
  const reviewId = fakeReviewId(repoFullName, prNumber); // unique text id
  const commitId = Math.random() < 0.7 ? makeSha() : null; // sometimes linked
  const assoc = authorAssociation();
  const body = Math.random() < 0.8 ? reviewBody(state, repoFullName) : null;
  const htmlUrl = `https://github.com/${repoFullName}/pull/${prNumber}#pullrequestreview-${reviewId.slice(
    -6
  )}`;

  const reviewer = reviewerGithubLogin ?? randomTeammates(1)[0];
  const [row] = await db
    .insert(githubReviews)
    .values({
      prId: pr.id,
      tenantId,
      reviewId,
      state,
      body,
      reviewerGithubLogin: reviewer,
      prAuthorGithubLogin,
      commitId: commitId ?? undefined,
      authorAssociation: assoc,
      submittedAt,
      htmlUrl,
      // fetchedAt defaults to now
    })
    .onConflictDoUpdate({
      target: [githubReviews.reviewId], // unique(review_id)
      set: {
        state,
        body,
        reviewerGithubLogin,
        commitId: commitId ?? null,
        authorAssociation: assoc,
        submittedAt,
        htmlUrl,
      },
    })
    .returning();

  // Decide probability for inline comments
  const inlineCommentProbability =
    typeof inlineCommentProbabilityOverride === 'number'
      ? inlineCommentProbabilityOverride
      : 0.7; // default behavior

  if (Math.random() < inlineCommentProbability) {
    await seedPrReviewComments({
      db,
      pr,
      tenantId,
      reviewDbId: row.id,
      reviewGitId: row.reviewId,
      reviewerGithubLogin: reviewer,
      createdAt: submittedAt,
      // later we can also pass an "intensity" hint here
    });
  }

  return row;
}
