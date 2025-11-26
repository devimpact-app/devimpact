/* eslint-disable no-console */
import { db as defaultDb } from '@/lib/db/client';
import {
  githubTimelineEvents,
  githubPrs,
  githubReviews,
} from '@/lib/db/schema';
import { InferSelectModel } from 'drizzle-orm';

type DB = typeof defaultDb;
type PRRow = InferSelectModel<typeof githubPrs>;
type ReviewRow = InferSelectModel<typeof githubReviews>;

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T>(a: T[]) => {
  const v = [...a];
  for (let i = v.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
};

function fakeEventId(pr: PRRow, kind: string, suffix?: string) {
  const base = Buffer.from(`${pr.repoFullName}#${pr.prNumber}:${kind}`)
    .toString('base64')
    .replace(/=/g, '');
  return `seed_evt_${base}${suffix ? `_${suffix}` : ''}`;
}
const prUrl = (pr: PRRow) =>
  `https://github.com/${pr.repoFullName}/pull/${pr.prNumber}`;

async function upsertEvent(
  db: DB,
  values: {
    prId: string;
    tenantId: string;
    eventId?: string | null;
    eventType: string;
    actorGithubLogin?: string | null;
    eventData?: unknown | null;

    // normalized review-request fields
    requestedTargetType?: 'user' | 'team' | null;
    requestedReviewerLogin?: string | null;
    requestedTeamSlug?: string | null;
    requestedTeamOrg?: string | null;

    createdAt: Date;
    url?: string | null;
  }
) {
  if (values.eventId) {
    await db
      .insert(githubTimelineEvents)
      .values(values)
      .onConflictDoUpdate({
        target: [githubTimelineEvents.prId, githubTimelineEvents.eventId],
        set: {
          eventType: values.eventType,
          actorGithubLogin: values.actorGithubLogin ?? null,
          eventData: (values.eventData as any) ?? null,
          requestedTargetType: values.requestedTargetType ?? null,
          requestedReviewerLogin: values.requestedReviewerLogin ?? null,
          requestedTeamSlug: values.requestedTeamSlug ?? null,
          requestedTeamOrg: values.requestedTeamOrg ?? null,
          createdAt: values.createdAt,
          url: values.url ?? null,
        },
      });
  } else {
    await db
      .insert(githubTimelineEvents)
      .values(values)
      .onConflictDoUpdate({
        target: [
          githubTimelineEvents.prId,
          githubTimelineEvents.eventType,
          githubTimelineEvents.createdAt,
          githubTimelineEvents.actorGithubLogin,
        ],
        set: {
          eventData: (values.eventData as any) ?? null,
          requestedTargetType: values.requestedTargetType ?? null,
          requestedReviewerLogin: values.requestedReviewerLogin ?? null,
          requestedTeamSlug: values.requestedTeamSlug ?? null,
          requestedTeamOrg: values.requestedTeamOrg ?? null,
          url: values.url ?? null,
        },
      });
  }
}

export async function seedPrTimelineEvents(params: {
  db?: DB;
  pr: PRRow;
  tenantId: string;

  // actors
  authorGithubLogin: string;

  // Use your already-seeded review rows to MIRROR timeline "reviewed" events:
  reviews: ReviewRow[]; // REQUIRED for exact alignment

  // Optional: create review_requested events too
  requestedTeam?: { slug: string; org: string } | null; // force a team request event

  // Controls
  generateRequestsFromReviews?: boolean; // if true, add user review_requested for each reviewer in `reviews`

  /**
   * Optional controls so archetypes can shape the timeline.
   * All fields are optional; if omitted we fall back to current behavior.
   */
  timelineConfig?: {
    /**
     * If provided, this is the timestamp used for the "merged" event.
     * Useful if your archetype already computed mergedAt from cycleTime.
     */
    mergedAt?: Date | null;

    /**
     * When generating review_requested from reviews, how long *before*
     * the submittedAt we place the request.
     * Defaults to [30, 240] minutes if omitted.
     */
    userRequestLeadMinutesRange?: [number, number];

    /**
     * Probability of adding a team review request if `requestedTeam` is not explicitly passed.
     * Defaults to 0.2 (20%) when omitted.
     */
    teamRequestProbability?: number;
  };
}) {
  const db = params.db ?? defaultDb;
  const {
    pr,
    tenantId,
    authorGithubLogin,
    reviews,
    requestedTeam,
    generateRequestsFromReviews = true,
    timelineConfig,
  } = params;

  // ---- 0) Resolve config with defaults ----
  const userRequestLeadMinutesRange: [number, number] =
    timelineConfig?.userRequestLeadMinutesRange ?? [30, 240];

  const teamRequestProbability =
    typeof timelineConfig?.teamRequestProbability === 'number'
      ? timelineConfig.teamRequestProbability
      : 0.2;

  // 1) Optional: review_requested generated from actual reviewers (keeps timeline coherent)
  if (generateRequestsFromReviews && reviews.length) {
    for (const r of reviews) {
      const reviewer = r.reviewerGithubLogin;

      const submittedAt = r.submittedAt ?? pr.updatedAt ?? pr.createdAt;

      // place the request before the review time using configurable window
      const [minLead, maxLead] = userRequestLeadMinutesRange;
      const leadMinutes = rand(minLead, maxLead);

      const requestAt = new Date(
        submittedAt.getTime() - leadMinutes * 60 * 1000 + rand(-120, 120)
      );

      await upsertEvent(db, {
        prId: pr.id,
        tenantId,
        eventId: fakeEventId(pr, 'review_requested', reviewer),
        eventType: 'review_requested',
        actorGithubLogin: authorGithubLogin,
        requestedTargetType: 'user',
        requestedReviewerLogin: reviewer,
        requestedTeamSlug: null,
        requestedTeamOrg: null,
        eventData: { type: 'user', requested_reviewer: reviewer },
        createdAt: requestAt,
        url: `${prUrl(pr)}/reviews`,
      });

      // small chance you remove a request (e.g., reassigned)
      if (Math.random() < 0.15 && requestAt < submittedAt) {
        const removedAt = new Date(
          requestAt.getTime() + rand(10, 90) * 60 * 1000
        );
        if (removedAt < submittedAt) {
          await upsertEvent(db, {
            prId: pr.id,
            tenantId,
            eventId: fakeEventId(pr, 'review_request_removed', reviewer),
            eventType: 'review_request_removed',
            actorGithubLogin: authorGithubLogin,
            requestedTargetType: 'user',
            requestedReviewerLogin: reviewer,
            eventData: { type: 'user', requested_reviewer: reviewer },
            createdAt: removedAt,
            url: `${prUrl(pr)}/reviews`,
          });
        }
      }
    }
  }

  // 1b) Optional: team review request (forced param OR probability)
  if (requestedTeam || Math.random() < teamRequestProbability) {
    const team = requestedTeam ?? {
      slug: pick(['frontend', 'platform']),
      org: 'acme',
    };

    // place after first request or a bit after PR open
    const baseTime =
      reviews[0]?.submittedAt ??
      new Date(pr.createdAt.getTime() + rand(1, 8) * 60 * 60 * 1000);

    const t = new Date(
      (baseTime instanceof Date ? baseTime : new Date(baseTime)).getTime() -
        rand(60, 180) * 60 * 1000
    );

    await upsertEvent(db, {
      prId: pr.id,
      tenantId,
      eventId: fakeEventId(pr, 'review_requested', `team_${team.slug}`),
      eventType: 'review_requested',
      actorGithubLogin: authorGithubLogin,
      requestedTargetType: 'team',
      requestedReviewerLogin: null,
      requestedTeamSlug: team.slug,
      requestedTeamOrg: team.org,
      eventData: {
        type: 'team',
        requested_team_slug: team.slug,
        org: team.org,
      },
      createdAt: t,
      url: `${prUrl(pr)}/reviews`,
    });

    if (Math.random() < 0.15) {
      const removedAt = new Date(t.getTime() + rand(30, 180) * 60 * 1000);
      await upsertEvent(db, {
        prId: pr.id,
        tenantId,
        eventId: fakeEventId(pr, 'review_request_removed', `team_${team.slug}`),
        eventType: 'review_request_removed',
        actorGithubLogin: authorGithubLogin,
        requestedTargetType: 'team',
        requestedReviewerLogin: null,
        requestedTeamSlug: team.slug,
        requestedTeamOrg: team.org,
        eventData: {
          type: 'team',
          requested_team_slug: team.slug,
          org: team.org,
        },
        createdAt: removedAt,
        url: `${prUrl(pr)}/reviews`,
      });
    }
  }

  // 2) MIRROR the actual reviews table → reviewed timeline events (no randomness)
  const ordered = [...reviews].sort(
    (a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0)
  );
  for (const rev of ordered) {
    const t = rev.submittedAt ?? pr.updatedAt ?? pr.createdAt;
    await upsertEvent(db, {
      prId: pr.id,
      tenantId,
      eventId: fakeEventId(pr, 'reviewed', rev.reviewerGithubLogin),
      eventType: 'reviewed',
      actorGithubLogin: rev.reviewerGithubLogin,
      eventData: {
        state: rev.state, // APPROVED / COMMENTED / CHANGES_REQUESTED
        review_id: rev.reviewId, // your GitHub text id from github_reviews
      },
      createdAt: t,
      url: `${prUrl(pr)}#pullrequestreview-${String(rev.reviewId).slice(-6)}`,
    });
  }

  // 3) PR merged (always) — now using the configured mergedAt when provided
  if (timelineConfig?.mergedAt) {
    const merger = ordered.length
      ? pick(ordered).reviewerGithubLogin
      : authorGithubLogin;

    await upsertEvent(db, {
      prId: pr.id,
      tenantId,
      eventId: fakeEventId(pr, 'merged'),
      eventType: 'merged',
      actorGithubLogin: merger,
      eventData: { merger, method: pick(['squash', 'merge', 'rebase']) },
      createdAt: timelineConfig.mergedAt,
      url: `${prUrl(pr)}/merge`,
    });
  }

  return { ok: true };
}
