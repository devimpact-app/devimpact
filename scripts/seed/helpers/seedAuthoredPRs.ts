/* eslint-disable no-console */
import { db } from "@/lib/db/client";
import { githubPrs } from "@/lib/db/schema";
import { seedPrFiles } from "./seedPrFiles";
import { seedPrCommits } from "./seedPrCommits";
import { seedPrReview } from "./seedPrReview";
import { weekdayNear } from "./seedReviewedPRs";
import { seedPrTimelineEvents } from "./seedPrTimelineEvents";

// ---- tiny helpers -----------------------------------------------------------

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const choice = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function nextWeekdayNear(base: Date, spreadDays = 3) {
  const d = new Date(base);
  d.setDate(d.getDate() + rand(0, spreadDays));
  // avoid weekends by bumping to Monday
  if (isWeekend(d)) {
    const bump = d.getDay() === 6 ? 2 : 1; // Sat -> Mon, Sun -> Mon
    d.setDate(d.getDate() + bump);
  }
  // clamp to "now"
  const now = new Date();
  return d > now ? now : d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// produce a deterministic “fake” external id/node id from repo + number
function fakeExternalIds(repoFullName: string, prNumber: number) {
  const base = Buffer.from(`${repoFullName}#${prNumber}`)
    .toString("base64")
    .replace(/=/g, "");
  return {
    externalId: `seed_pr_${base}`, // text ok
    externalNodeId: `PR_node_${base}`, // text ok
  };
}

// Lightweight PR title generator
function prTitle(repo: string) {
  const verbs = ["feat", "fix", "refactor", "chore", "docs", "test"];
  const areas = {
    "acme/frontend": [
      "navbar",
      "dashboard",
      "auth modal",
      "theme tokens",
      "settings panel",
    ],
    "acme/api": [
      "auth flow",
      "webhooks",
      "rate limiter",
      "repo sync",
      "PR ingest",
    ],
    "acme/infra": ["terraform", "CI cache", "docker build", "logging", "redis"],
  } as Record<string, string[]>;
  const v = choice(verbs);
  const a = choice(areas[repo] ?? ["misc"]);
  const suffix = rand(100, 999);
  return `${v}: ${a} ${suffix}`;
}

function prBody(repo: string) {
  const lines = [
    "- Adds unit tests and improves error handling.",
    "- Breaks down component and reduces prop drilling.",
    "- Improves p50 by ~20% on typical path.",
    "- Introduces feature flag and migration path.",
    "- Small DX cleanup + updated docs.",
  ];
  return `This PR updates ${repo}.\n\n${choice(lines)}\n`;
}

// ---- main seeder ------------------------------------------------------------

export async function seedAuthoredPRs(params: {
  tenantId: string;
  authorGithubLogin: string; // e.g., "irichard620"
  repos: Array<{ fullName: string; owner: string; name: string }>;
  lookbackDays?: number; // default 90
}) {
  const { tenantId, authorGithubLogin, repos, lookbackDays = 90 } = params;

  if (!repos.length) {
    console.warn("seedAuthoredPRs: no repos provided, skipping.");
    return [];
  }

  // Target: ~2–4 PRs per week, over `lookbackDays`.
  const weeks = Math.ceil(lookbackDays / 7);
  const totalTarget = rand(2, 4) * weeks; // e.g., ~ 20–30 PRs

  // Start pseudo “PR numbers” per repo so they don’t collide within a repo
  // (If you already have real PRs, you could query max(pr_number) per repo here)
  const prNumberSeed: Record<string, number> = {};
  for (const r of repos) {
    prNumberSeed[r.fullName] = rand(120, 280);
  }

  const rows = [];

  // Distribute PRs across timeline and repos
  for (let i = 0; i < totalTarget; i++) {
    // Spread base date roughly evenly across the window, then nudge onto weekdays
    const baseOffset = Math.floor((i / totalTarget) * lookbackDays);
    const createdAt = nextWeekdayNear(daysAgo(lookbackDays - baseOffset), 2);

    // Repo selection with a slight preference for frontend/api
    const repo = choice(
      [
        repos[0],
        repos[0], // weight front
        repos[1],
        repos[1], // weight api
        repos[2], // infra less frequent
      ].filter(Boolean),
    );

    const prNumber = ++prNumberSeed[repo.fullName];

    // Status mix: ~80% merged, 10% still open, 10% closed without merge
    const r = Math.random();
    const state = "closed";
    const merged = r < 0.8; // of the closed ones, most are merged
    const draft = Math.random() < 0.12; // ~12% drafts

    const reviewLagDays = draft ? rand(2, 5) : rand(1, 3);
    const mergeLag = merged ? rand(0, 2) : 0;

    const updatedAt =
      merged || state === "closed"
        ? nextWeekdayNear(
            new Date(createdAt.getTime() + reviewLagDays * 24 * 3600 * 1000),
            1,
          )
        : createdAt;

    const mergedAt = merged
      ? nextWeekdayNear(
          new Date(updatedAt.getTime() + mergeLag * 24 * 3600 * 1000),
          0,
        )
      : null;

    const closedAt = state === "closed" ? (mergedAt ?? updatedAt) : null;

    const title = prTitle(repo.fullName);
    const body = prBody(repo.fullName);
    const ids = fakeExternalIds(repo.fullName, prNumber);

    const htmlUrl = `https://github.com/${repo.fullName}/pull/${prNumber}`;

    rows.push({
      tenantId,
      externalId: ids.externalId,
      externalNodeId: ids.externalNodeId,
      prNumber,
      repoFullName: repo.fullName,
      repoOwner: repo.owner,
      repoName: repo.name,

      title,
      body,
      state,
      draft,

      authorGithubLogin,

      createdAt,
      updatedAt,
      closedAt,

      htmlUrl,
      // fetchedAt defaults to now via schema
    });
  }

  // Sort by createdAt to look natural in UI
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Insert/upsert
  const inserted: any[] = [];
  for (const row of rows) {
    const [rec] = await db
      .insert(githubPrs)
      .values(row)
      .onConflictDoUpdate({
        // unique(tenantId, repoFullName, prNumber)
        target: [
          githubPrs.tenantId,
          githubPrs.repoFullName,
          githubPrs.prNumber,
        ],
        set: {
          // keep mutable fields fresh in case you re-run seed
          externalId: row.externalId,
          externalNodeId: row.externalNodeId,
          title: row.title,
          body: row.body,
          state: row.state,
          draft: row.draft,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          closedAt: row.closedAt,
          htmlUrl: row.htmlUrl,
        },
      })
      .returning();

    inserted.push({ prId: rec.id });

    const reviewLagDays = rand(0, 2); // you review within ~0-2 days
    const reviewedAt = weekdayNear(
      new Date(row.createdAt.getTime() + reviewLagDays * 864e5),
      1,
    );

    const review = await seedPrReview({
      db, // pass your tx if inside a transaction
      pr: rec,
      tenantId,
      prNumber: row.prNumber, // the PR number you generated
      repoFullName: row.repoFullName,
      submittedAt: reviewedAt, // when you reviewed
    });

    await seedPrFiles({
      db, // or tx if you're inside a transaction
      pr: rec,
      tenantId,
      authorGithubLogin: row.authorGithubLogin, // for authored PRs
    });

    await seedPrCommits({
      db, // or tx if you're inside a transaction
      pr: rec,
      tenantId,
      authorGithubLogin: row.authorGithubLogin, // for authored PRs
    });

    await seedPrTimelineEvents({
      db, // tx or db
      pr: rec,
      tenantId,
      authorGithubLogin: row.authorGithubLogin,
      reviews: [review],
      generateRequestsFromReviews: true,
    });
  }

  return inserted;
}
