/* eslint-disable no-console */
import { db as defaultDb } from "@/lib/db/client";
import {
  githubReviewComments,
  githubPrFiles,
  githubPrCommits,
  githubPrs,
} from "@/lib/db/schema";
import { InferSelectModel, desc, eq } from "drizzle-orm";

type DB = typeof defaultDb;
type PRRow = InferSelectModel<typeof githubPrs>;

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function makeSha() {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 40; i++) s += hex[rand(0, 15)];
  return s;
}

function fakeCommentId(reviewGitId: string, i: number) {
  // stable-ish unique text id for seed runs
  return `seed_c_${reviewGitId}_${i}_${rand(1000, 9999)}`;
}

function bodyForTheme(theme: string) {
  const lib: Record<string, string[]> = {
    correctness: [
      "Edge case: null/undefined handling needed here.",
      "This path can throw if `repo` is missing; add a guard.",
      "Off-by-one risk — consider inclusive bounds.",
    ],
    style: [
      "Nit: consider extracting to a helper to reduce nesting.",
      "Prefer early returns to reduce indentation.",
      "Minor: align naming with the rest of the module.",
    ],
    tests: [
      "Can we add a test for the failure case?",
      "Missing coverage for timeout branch.",
      "Consider a unit test around the parser with invalid input.",
    ],
    perf: [
      "Potential hot path — maybe memoize or batch this.",
      "Consider using a single query to avoid N+1.",
      "Could we debounce this to reduce calls?",
    ],
    docs: [
      "Add a brief comment describing the contract here.",
      "Public function — worth documenting the return shape.",
      "Changelog note might help future readers.",
    ],
    naming: [
      "Name is a bit vague; consider something more specific.",
      "Nit: align variable name with type.",
      "`data` could be `repoMeta` for clarity.",
    ],
    security: [
      "Sanitize this field before logging.",
      "Ensure token values never hit logs.",
      "Input should be validated against allowed list.",
    ],
  };
  const pool = lib[theme] ?? ["Looks good."];
  return pick(pool);
}

/**
 * Seed inline review comments for a given review (0..N, with light threading).
 * - Tries to attach to real PR files and (if present) a commit SHA from PR commits.
 */
export async function seedPrReviewComments(params: {
  db?: DB;
  pr: PRRow;
  tenantId: string;
  // DB id of the review row (UUID) and the GitHub text id you stored in github_reviews.review_id
  reviewDbId: string;
  reviewGitId: string;
  reviewerGithubLogin: string;
  createdAt: Date; // base time (usually the review submittedAt)
}) {
  const db = params.db ?? defaultDb;
  const {
    pr,
    tenantId,
    reviewDbId,
    reviewGitId,
    reviewerGithubLogin,
    createdAt,
  } = params;

  // Decide how many comments: 0, 1–2, or 3–4 (skewed to fewer)
  const dice = Math.random();
  const count = dice < 0.35 ? 0 : dice < 0.8 ? rand(1, 2) : rand(3, 4);
  if (count === 0) return { count: 0 };

  // Pull a few PR files to attach comments to (fallback to fake paths if none)
  const files = await db
    .select({
      path: githubPrFiles.filename,
    })
    .from(githubPrFiles)
    .where(eq(githubPrFiles.prId, pr.id))
    .limit(10);

  const filePaths = files.length
    ? files.map((f) => f.path)
    : [
        "src/lib/utils.ts",
        "src/components/Card.tsx",
        "api/routes/sync.ts",
        ".github/workflows/ci.yml",
      ];

  // Optionally tie comments to a commit SHA if we have commits
  const commits = await db
    .select({ sha: githubPrCommits.sha })
    .from(githubPrCommits)
    .where(eq(githubPrCommits.prId, pr.id))
    .orderBy(desc(githubPrCommits.committedAt))
    .limit(5);
  const commitSha = commits[0]?.sha ?? (Math.random() < 0.5 ? makeSha() : null);

  const themes = [
    "correctness",
    "style",
    "tests",
    "perf",
    "docs",
    "naming",
    "security",
  ];

  // Build comments; 30% chance to create a 2-message thread (reply)
  const rows: any[] = [];
  for (let i = 0; i < count; i++) {
    const path = pick(filePaths);
    const line = rand(5, 220);
    const theme = pick(themes);
    const baseId = fakeCommentId(reviewGitId, i);

    const first = {
      tenantId,
      prId: pr.id,
      reviewId: reviewDbId, // FK to github_reviews.id (UUID)
      commentId: baseId, // unique text id
      pullRequestReviewId: reviewGitId, // the GitHub review id text you seeded
      body: bodyForTheme(theme),
      path,
      line,
      side: "RIGHT" as const,
      authorGithubLogin: reviewerGithubLogin,
      authorAssociation: "MEMBER",
      inReplyToId: null,
      commitId: commitSha ?? null,
      diffHunk: null, // keep small; can add snippet if desired
      createdAt,
      updatedAt: createdAt,
      htmlUrl: `https://github.com/${pr.repoFullName}/pull/${pr.prNumber}#discussion-${baseId.slice(-6)}`,
    };
    rows.push(first);

    // Thread reply (30% chance)
    if (Math.random() < 0.3) {
      const replyId = `${baseId}_r`;
      rows.push({
        ...first,
        commentId: replyId,
        inReplyToId: baseId,
        body: "Follow-up: resolved in the latest commit, thanks!",
        createdAt: new Date(createdAt.getTime() + rand(5, 45) * 60 * 1000),
        updatedAt: new Date(createdAt.getTime() + rand(5, 45) * 60 * 1000),
        htmlUrl: `https://github.com/${pr.repoFullName}/pull/${pr.prNumber}#discussion-${replyId.slice(-6)}`,
      });
    }
  }

  // Upsert comments by unique(comment_id)
  for (const c of rows) {
    await db
      .insert(githubReviewComments)
      .values(c)
      .onConflictDoUpdate({
        target: [githubReviewComments.commentId],
        set: {
          body: c.body,
          path: c.path,
          line: c.line,
          startLine: c.startLine ?? null,
          side: c.side,
          authorGithubLogin: c.authorGithubLogin,
          authorAssociation: c.authorAssociation ?? null,
          inReplyToId: c.inReplyToId ?? null,
          commitId: c.commitId ?? null,
          diffHunk: c.diffHunk ?? null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          htmlUrl: c.htmlUrl ?? null,
          pullRequestReviewId: c.pullRequestReviewId ?? null,
        },
      });
  }

  return { count: rows.length };
}
