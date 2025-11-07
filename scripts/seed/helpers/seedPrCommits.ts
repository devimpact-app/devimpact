/* eslint-disable no-console */
import { InferSelectModel } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { githubPrs, githubPrCommits } from "@/lib/db/schema";

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

function clampDate(d: Date, min: Date, max: Date) {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

function timeBetween(start: Date, end: Date, jitterHours = 6) {
  // choose a time uniformly between, then jitter by a few hours
  const startMs = start.getTime();
  const endMs = end.getTime();
  const base = new Date(startMs + Math.random() * Math.max(1, endMs - startMs));
  base.setHours(base.getHours() + rand(-jitterHours, jitterHours));
  return clampDate(base, start, end);
}

function conventionalMessage(repo: string) {
  const types = ["feat", "fix", "refactor", "chore", "docs", "test"];
  const scopesByRepo: Record<string, string[]> = {
    "acme/frontend": ["ui", "auth", "dashboard", "theme", "settings"],
    "acme/api": ["routes", "webhook", "ratelimit", "sync", "errors"],
    "acme/infra": ["ci", "docker", "terraform", "logging", "redis"],
  };
  const scope = pick(scopesByRepo[repo] ?? ["misc"]);
  const subjects = [
    "initial pass",
    "tweak and cleanup",
    "address feedback",
    "edge cases",
    "tests",
    "minor polish",
  ];
  return `${pick(types)}(${scope}): ${pick(subjects)}`;
}

function reviewFollowupMessage() {
  const items = [
    "address review comments",
    "rename per feedback",
    "fix lint + types",
    "add missing tests",
    "handle error path",
  ];
  return `fix: ${pick(items)}`;
}

/**
 * Seed commits for a single PR.
 * - Respects pr.commitsCount if present; otherwise derives from changedFiles.
 * - Distributes committedAt across PR lifetime.
 */
export async function seedPrCommits(params: {
  db?: DB; // optional tx/db
  pr: PRRow; // PR row with timestamps & repoFullName
  tenantId: string;
  authorGithubLogin: string; // commit author (usually PR author)
}) {
  const db = params.db ?? defaultDb;
  const { pr, tenantId, authorGithubLogin } = params;

  const start = pr.createdAt ?? new Date();
  const end =
    pr.closedAt ?? pr.updatedAt ?? new Date(start.getTime() + 24 * 3600 * 1000); // +1 day fallback

  // decide commit count
  const baseCount = rand(1, 6);

  // add a tiny chance of an extra "address review" commit if PR merged
  const extra = pr.closedAt ? (Math.random() < 0.35 ? 1 : 0) : 0;
  const total = Math.max(1, baseCount + extra);

  // generate commits
  const commits = [];
  for (let i = 0; i < total; i++) {
    const sha = makeSha();
    const committedAt = timeBetween(start, end, 8);
    const message =
      extra && i === total - 1 && pr.closedAt
        ? reviewFollowupMessage()
        : conventionalMessage(pr.repoFullName);

    commits.push({
      tenantId,
      prId: pr.id,
      sha,
      message,
      committedAt,
      authorGithubLogin,
      htmlUrl: `https://github.com/${pr.repoFullName}/commit/${sha}`,
      // fetchedAt defaults to now via schema
    });
  }

  // upsert by (prId, sha)
  for (const c of commits) {
    await db
      .insert(githubPrCommits)
      .values(c)
      .onConflictDoUpdate({
        target: [githubPrCommits.prId, githubPrCommits.sha],
        set: {
          message: c.message,
          committedAt: c.committedAt,
          authorGithubLogin: c.authorGithubLogin,
          htmlUrl: c.htmlUrl,
        },
      });
  }

  return { count: commits.length };
}
