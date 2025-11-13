import { db } from "@/lib/db/client";
import { githubTimelineEvents, githubReviews } from "@/lib/db/schema";
import { and, eq, inArray, gte } from "drizzle-orm";

export type EvidenceRow = {
  githubLogin: string;
  org: string;
  teamSlug: string;

  req_to_review: number; // you reviewed after that team was requested
  user_direct_requests: number; // you were directly requested on PRs that also requested that team
  all_team_requested_reviews_for_login: number;
  first_responder_count?: number; // user was first to review after the team request
};

export async function computeEvidenceCounts(opts: {
  tenantId: string;
  username: string;
  since?: Date;
}): Promise<EvidenceRow[]> {
  const { tenantId, username, since } = opts;

  const teamReqWhere = [
    eq(githubTimelineEvents.tenantId, tenantId),
    eq(githubTimelineEvents.eventType, "review_requested"),
    eq(githubTimelineEvents.requestedTargetType, "team"),
  ];
  if (since) teamReqWhere.push(gte(githubTimelineEvents.createdAt, since));

  const teamRequests = await db
    .select({
      prId: githubTimelineEvents.prId,
      at: githubTimelineEvents.createdAt,
      org: githubTimelineEvents.requestedTeamOrg,
      teamSlug: githubTimelineEvents.requestedTeamSlug,
    })
    .from(githubTimelineEvents)
    .where(and(...teamReqWhere));

  // Index team requests by PR, with timestamps
  const teamReqByPr = new Map<
    string,
    { at: Date; org: string; teamSlug: string }[]
  >();
  for (const r of teamRequests) {
    if (!r.org || !r.teamSlug) continue;
    const arr = teamReqByPr.get(r.prId) ?? [];
    arr.push({ at: r.at, org: r.org, teamSlug: r.teamSlug });
    teamReqByPr.set(r.prId, arr);
  }

  const directReqWhere = [
    eq(githubTimelineEvents.tenantId, tenantId),
    eq(githubTimelineEvents.eventType, "review_requested"),
    eq(githubTimelineEvents.requestedTargetType, "user"),
    eq(githubTimelineEvents.requestedReviewerLogin, username),
  ];
  if (since) directReqWhere.push(gte(githubTimelineEvents.createdAt, since));

  const directUserRequests = await db
    .select({
      prId: githubTimelineEvents.prId,
      at: githubTimelineEvents.createdAt,
    })
    .from(githubTimelineEvents)
    .where(and(...directReqWhere));

  const reviewWhere = [
    eq(githubReviews.tenantId, tenantId),
    eq(githubReviews.reviewerGithubLogin, username),
  ];
  if (since) reviewWhere.push(gte(githubReviews.submittedAt, since));

  const myReviews = await db
    .select({
      prId: githubReviews.prId,
      at: githubReviews.submittedAt,
    })
    .from(githubReviews)
    .where(and(...reviewWhere));

  const firstTeamReqAtByPr = new Map<string, Date>();
  for (const r of teamRequests) {
    const prev = firstTeamReqAtByPr.get(r.prId);
    if (!prev || r.at < prev) firstTeamReqAtByPr.set(r.prId, r.at);
  }

  let allTeamRequestedReviewsForLogin = 0;
  for (const rv of myReviews) {
    const firstReqAt = firstTeamReqAtByPr.get(rv.prId);
    if (firstReqAt && rv.at && rv.at >= firstReqAt) {
      allTeamRequestedReviewsForLogin += 1;
    }
  }

  // Helper to get/make row
  const acc = new Map<string, EvidenceRow>();
  const row = (org: string, teamSlug: string) => {
    const key = `${org}::${teamSlug}`;
    let r = acc.get(key);
    if (!r) {
      r = {
        githubLogin: username,
        org,
        teamSlug,
        req_to_review: 0,
        user_direct_requests: 0,
        all_team_requested_reviews_for_login: allTeamRequestedReviewsForLogin,
        first_responder_count: 0, // optional
      };
      acc.set(key, r);
    }
    return r;
  };

  for (const rv of myReviews) {
    if (!rv.at) continue;
    const teamReqs = teamReqByPr.get(rv.prId) ?? [];
    for (const tr of teamReqs) {
      if (!tr.org || !tr.teamSlug || !tr.at) continue;
      if (rv.at >= tr.at) {
        row(tr.org, tr.teamSlug).req_to_review += 1;
      }
    }
  }

  const teamReqsByPrQuick = teamReqByPr; // alias for clarity
  for (const dr of directUserRequests) {
    const teams = teamReqsByPrQuick.get(dr.prId) ?? [];
    for (const t of teams) {
      row(t.org, t.teamSlug).user_direct_requests += 1;
    }
  }

  return [...acc.values()];
}
