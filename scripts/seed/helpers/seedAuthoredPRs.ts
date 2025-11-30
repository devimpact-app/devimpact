/* eslint-disable no-console */
import { db } from '@/lib/db/client';
import { githubPrs, NewGithubPR } from '@/lib/db/schema';
import { FilesConfig, seedPrFiles } from './seedPrFiles';
import { seedPrCommits } from './seedPrCommits';
import { seedPrReview } from './seedPrReview';
import { seedPrTimelineEvents } from './seedPrTimelineEvents';

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
    .toString('base64')
    .replace(/=/g, '');
  return {
    externalId: `seed_pr_${base}`, // text ok
    externalNodeId: `PR_node_${base}`, // text ok
  };
}

// Lightweight PR title generator
function prTitle(repo: string) {
  const verbs = ['feat', 'fix', 'refactor', 'chore', 'docs', 'test'];
  const areas = {
    'acme/frontend': [
      'navbar',
      'dashboard',
      'auth modal',
      'theme tokens',
      'settings panel',
    ],
    'acme/api': [
      'auth flow',
      'webhooks',
      'rate limiter',
      'repo sync',
      'PR ingest',
    ],
    'acme/infra': ['terraform', 'CI cache', 'docker build', 'logging', 'redis'],
  } as Record<string, string[]>;
  const v = choice(verbs);
  const a = choice(areas[repo] ?? ['misc']);
  const suffix = rand(100, 999);
  return `${v}: ${a} ${suffix}`;
}

function prBody(repo: string) {
  const lines = [
    '- Adds unit tests and improves error handling.',
    '- Breaks down component and reduces prop drilling.',
    '- Improves p50 by ~20% on typical path.',
    '- Introduces feature flag and migration path.',
    '- Small DX cleanup + updated docs.',
  ];
  return `This PR updates ${repo}.\n\n${choice(lines)}\n`;
}

type PrArchetypeId =
  | 'small_fast_clean'
  | 'medium_normal'
  | 'large_slow_friction'
  | 'refactor_high_leverage';

type PrArchetype = {
  id: PrArchetypeId;
  weight: number;

  sizeBucket: 'tiny' | 'small' | 'medium' | 'large';

  // how long from "ready" → merge
  cycleTimeHoursRange: [number, number];

  // how long from "ready" → first review
  timeToFirstReviewHoursRange: [number, number];

  // used later (Step 2+) to tune reviews/files/etc
  changesRequestedProbability: number;
  highDiscussionProbability: number;
};

type SeedPrPlan = {
  row: NewGithubPR;

  // extra metadata used only inside seeding logic
  archetype: PrArchetype;
  mergedAt: Date | null;
  cycleHours: number;
  timeToFirstReviewHours: number;
};

const PR_ARCHETYPES: PrArchetype[] = [
  {
    id: 'small_fast_clean',
    weight: 3,
    sizeBucket: 'small',
    cycleTimeHoursRange: [4, 12],
    timeToFirstReviewHoursRange: [1, 3],
    changesRequestedProbability: 0.05,
    highDiscussionProbability: 0.1,
  },
  {
    id: 'medium_normal',
    weight: 4,
    sizeBucket: 'medium',
    cycleTimeHoursRange: [12, 36],
    timeToFirstReviewHoursRange: [4, 20],
    changesRequestedProbability: 0.2,
    highDiscussionProbability: 0.3,
  },
  {
    id: 'large_slow_friction',
    weight: 2,
    sizeBucket: 'large',
    cycleTimeHoursRange: [36, 72],
    timeToFirstReviewHoursRange: [8, 32],
    changesRequestedProbability: 0.6,
    highDiscussionProbability: 0.7,
  },
  {
    id: 'refactor_high_leverage',
    weight: 2,
    sizeBucket: 'large',
    cycleTimeHoursRange: [8, 24],
    timeToFirstReviewHoursRange: [2, 12],
    changesRequestedProbability: 0.3,
    highDiscussionProbability: 0.4,
  },
];

function pickArchetype(): PrArchetype {
  const total = PR_ARCHETYPES.reduce((sum, a) => sum + a.weight, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const a of PR_ARCHETYPES) {
    acc += a.weight;
    if (r <= acc) return a;
  }
  return PR_ARCHETYPES[0];
}

function pickInRangeHours([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

function filesConfigForArchetype(archetype: PrArchetype): FilesConfig {
  switch (archetype.sizeBucket) {
    case 'tiny':
      return {
        fileCountRange: [1, 3],
        totalAddsRange: [10, 60],
        totalDelsRange: [0, 20],
        testBias: 0.4,
      };
    case 'small':
      return {
        fileCountRange: [3, 6],
        totalAddsRange: [40, 150],
        totalDelsRange: [10, 60],
        testBias: 0.35,
      };
    case 'medium':
      return {
        fileCountRange: [5, 10],
        totalAddsRange: [120, 300],
        totalDelsRange: [40, 150],
        testBias: 0.3,
      };
    case 'large':
    default:
      return {
        fileCountRange: [8, 16],
        totalAddsRange: [250, 700],
        totalDelsRange: [80, 300],
        testBias: 0.25,
      };
  }
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
    console.warn('seedAuthoredPRs: no repos provided, skipping.');
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

  const plans: SeedPrPlan[] = [];
  for (let i = 0; i < totalTarget; i++) {
    // Spread base date roughly evenly across the window, then nudge onto weekdays
    const baseOffset = Math.floor((i / totalTarget) * lookbackDays);
    const baseDate = daysAgo(lookbackDays - baseOffset);
    const createdAt = nextWeekdayNear(baseDate, 2);

    // Repo selection with a slight preference for frontend/api
    const repo = choice(
      [
        repos[0],
        repos[0], // weight front
        repos[1],
        repos[1], // weight api
        repos[2], // infra less frequent
      ].filter(Boolean)
    );

    const prNumber = ++prNumberSeed[repo.fullName];

    // Status mix: ~80% merged, 10% still open, 10% closed without merge
    const r = Math.random();
    const state = 'closed';
    const merged = r < 0.8; // of the closed ones, most are merged
    const draft = Math.random() < 0.12; // ~12% drafts

    const archetype = pickArchetype();

    const cycleHours = pickInRangeHours(archetype.cycleTimeHoursRange);
    const timeToFirstReviewHours = pickInRangeHours(
      archetype.timeToFirstReviewHoursRange
    );

    // merged / updated / closed times derived from those hours
    let mergedAt: Date | null = null;
    let updatedAt = createdAt;

    if (merged) {
      mergedAt = new Date(createdAt.getTime() + cycleHours * 60 * 60 * 1000);
      updatedAt = mergedAt;
    } else {
      // not merged yet: updatedAt is sometime after creation, but before "cycleHours"
      const partialHours = Math.max(1, cycleHours * 0.5);
      updatedAt = new Date(createdAt.getTime() + partialHours * 60 * 60 * 1000);
    }

    const closedAt = state === 'closed' ? (mergedAt ?? updatedAt) : null;

    const title = prTitle(repo.fullName);
    const body = prBody(repo.fullName);
    const ids = fakeExternalIds(repo.fullName, prNumber);

    const htmlUrl = `https://github.com/${repo.fullName}/pull/${prNumber}`;

    plans.push({
      row: {
        tenantId,
        externalId: ids.externalId,
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
      },
      archetype,
      mergedAt,
      timeToFirstReviewHours,
      cycleHours,
    });
  }

  // Sort by createdAt to look natural in UI
  plans.sort((a, b) => a.row.createdAt.getTime() - b.row.createdAt.getTime());

  // Insert/upsert
  const inserted: any[] = [];
  for (const plan of plans) {
    const { row, archetype, timeToFirstReviewHours, mergedAt, cycleHours } =
      plan;

    const [rec] = await db
      .insert(githubPrs)
      .values(row)
      .onConflictDoUpdate({
        target: [
          githubPrs.tenantId,
          githubPrs.repoFullName,
          githubPrs.prNumber,
        ],
        set: {
          // keep mutable fields fresh in case you re-run seed
          externalId: row.externalId,
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

    const firstReviewAt = new Date(
      row.createdAt.getTime() + timeToFirstReviewHours * 60 * 60 * 1000
    );

    // decide state based on changesRequestedProbability
    const wantsChangesRequested =
      Math.random() < archetype.changesRequestedProbability;
    const preferredState: 'APPROVED' | 'COMMENTED' | 'CHANGES_REQUESTED' =
      wantsChangesRequested ? 'CHANGES_REQUESTED' : 'APPROVED';
    const inlineCommentProbabilityOverride =
      archetype.highDiscussionProbability;

    const reviews = [];

    // If PR is merged AND we “want” changes requested, create two reviews:
    if (mergedAt && wantsChangesRequested) {
      // 1) First review: changes requested
      const changesReview = await seedPrReview({
        db,
        pr: rec,
        tenantId,
        prNumber: row.prNumber,
        repoFullName: row.repoFullName,
        submittedAt: firstReviewAt,
        prAuthorGithubLogin: row.authorGithubLogin,
        preferredState: 'CHANGES_REQUESTED',
        inlineCommentProbabilityOverride,
      });
      reviews.push(changesReview);

      // 2) Second review: approval somewhere later before merge
      const remainingHours = Math.max(2, cycleHours - timeToFirstReviewHours);

      // Put approval somewhere in the latter half of remaining time, with some jitter
      const approvalDelayHours = Math.max(
        1,
        remainingHours * (0.4 + Math.random() * 0.4)
      );

      const approvalAt = new Date(
        firstReviewAt.getTime() + approvalDelayHours * 60 * 60 * 1000
      );

      // Guard against weirdness: don’t approve after mergedAt
      const safeApprovalAt =
        approvalAt > mergedAt
          ? new Date(mergedAt.getTime() - 60 * 60 * 1000)
          : approvalAt;

      const approvalReview = await seedPrReview({
        db,
        pr: rec,
        tenantId,
        prNumber: row.prNumber,
        repoFullName: row.repoFullName,
        submittedAt: safeApprovalAt,
        prAuthorGithubLogin: row.authorGithubLogin,
        preferredState: 'APPROVED',
        inlineCommentProbabilityOverride:
          inlineCommentProbabilityOverride * 0.7,
      });
      reviews.push(approvalReview);
    } else {
      // Single-review case: either clean APPROVED or one CHANGES_REQUESTED
      const preferredState: 'APPROVED' | 'COMMENTED' | 'CHANGES_REQUESTED' =
        wantsChangesRequested ? 'CHANGES_REQUESTED' : 'APPROVED';

      const review = await seedPrReview({
        db,
        pr: rec,
        tenantId,
        prNumber: row.prNumber,
        repoFullName: row.repoFullName,
        submittedAt: firstReviewAt,
        prAuthorGithubLogin: row.authorGithubLogin,
        preferredState,
        inlineCommentProbabilityOverride,
      });
      reviews.push(review);
    }

    const filesConfig = filesConfigForArchetype(archetype);

    await seedPrFiles({
      db,
      pr: rec,
      tenantId,
      authorGithubLogin: row.authorGithubLogin,
      filesConfig,
    });

    await seedPrCommits({
      db, // or tx if you're inside a transaction
      pr: rec,
      tenantId,
      authorGithubLogin: row.authorGithubLogin, // for authored PRs
    });

    await seedPrTimelineEvents({
      db,
      pr: rec,
      tenantId,
      authorGithubLogin: row.authorGithubLogin,
      reviews,
      generateRequestsFromReviews: true,
      timelineConfig: {
        mergedAt,
        userRequestLeadMinutesRange: [45, 180], // e.g. ~1–3h before review
        teamRequestProbability:
          archetype.id === 'large_slow_friction' ? 0.4 : 0.15,
      },
    });
  }

  return inserted;
}
