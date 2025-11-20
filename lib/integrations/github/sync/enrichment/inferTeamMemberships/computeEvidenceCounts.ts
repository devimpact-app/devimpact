import { db } from '@/lib/db/client'
import { githubTimelineEvents, githubReviews } from '@/lib/db/schema'
import { and, eq, inArray, gte } from 'drizzle-orm'

export type EvidenceRow = {
  githubLogin: string
  org: string
  teamSlug: string

  reqToReview: number // you reviewed after that team was requested
  userDirectRequests: number // you were directly requested on PRs that also requested that team
}

export async function computeEvidenceCounts(opts: {
  tenantId: string
  username: string
  since?: Date
}): Promise<{
  rows: EvidenceRow[]
  totalReviewsAfterAnyTeamRequestDelta: number
  totalDirectRequestsAfterTeamRequestDelta: number
}> {
  const { tenantId, username, since } = opts

  const teamReqWhere = [
    eq(githubTimelineEvents.tenantId, tenantId),
    eq(githubTimelineEvents.eventType, 'review_requested'),
    eq(githubTimelineEvents.requestedTargetType, 'team'),
  ]

  const teamRequests = await db
    .select({
      prId: githubTimelineEvents.prId,
      at: githubTimelineEvents.createdAt,
      org: githubTimelineEvents.requestedTeamOrg,
      teamSlug: githubTimelineEvents.requestedTeamSlug,
    })
    .from(githubTimelineEvents)
    .where(and(...teamReqWhere))

  // Compute map of team requests per PR and per team
  const teamReqByPr = new Map<
    string,
    { org: string; teamSlug: string; firstRequestedAt: Date }[]
  >()

  for (const r of teamRequests) {
    if (!r.org || !r.teamSlug) continue
    const key = `${r.org}::${r.teamSlug}`
    const arr = teamReqByPr.get(r.prId) ?? []

    const existing = arr.find((t) => `${t.org}::${t.teamSlug}` === key)
    if (!existing) {
      arr.push({ org: r.org, teamSlug: r.teamSlug, firstRequestedAt: r.at })
    } else if (r.at < existing.firstRequestedAt) {
      existing.firstRequestedAt = r.at
    }

    teamReqByPr.set(r.prId, arr)
  }

  const directReqWhere = [
    eq(githubTimelineEvents.tenantId, tenantId),
    eq(githubTimelineEvents.eventType, 'review_requested'),
    eq(githubTimelineEvents.requestedTargetType, 'user'),
    eq(githubTimelineEvents.requestedReviewerLogin, username),
  ]
  if (since) directReqWhere.push(gte(githubTimelineEvents.createdAt, since))

  const directUserRequests = await db
    .select({
      prId: githubTimelineEvents.prId,
      at: githubTimelineEvents.createdAt,
    })
    .from(githubTimelineEvents)
    .where(and(...directReqWhere))

  const reviewWhere = [
    eq(githubReviews.tenantId, tenantId),
    eq(githubReviews.reviewerGithubLogin, username),
  ]
  if (since) reviewWhere.push(gte(githubReviews.submittedAt, since))

  const myReviews = await db
    .select({
      prId: githubReviews.prId,
      at: githubReviews.submittedAt,
    })
    .from(githubReviews)
    .where(and(...reviewWhere))

  const firstTeamReqAtByPr = new Map<string, Date>()
  for (const r of teamRequests) {
    const prev = firstTeamReqAtByPr.get(r.prId)
    if (!prev || r.at < prev) firstTeamReqAtByPr.set(r.prId, r.at)
  }

  // Helper to get/make row
  const acc = new Map<string, EvidenceRow>()
  const row = (org: string, teamSlug: string) => {
    const key = `${org}::${teamSlug}`
    let r = acc.get(key)
    if (!r) {
      r = {
        githubLogin: username,
        org,
        teamSlug,
        reqToReview: 0,
        userDirectRequests: 0,
      }
      acc.set(key, r)
    }
    return r
  }

  for (const rv of myReviews) {
    if (!rv.at) continue
    const teams = teamReqByPr.get(rv.prId) ?? []
    for (const t of teams) {
      if (rv.at >= t.firstRequestedAt) {
        row(t.org, t.teamSlug).reqToReview += 1
      }
    }
  }

  for (const dr of directUserRequests) {
    if (!dr.at) continue
    const teams = teamReqByPr.get(dr.prId) ?? []

    for (const t of teams) {
      // Only count if team was requested before (or very close to) my direct request
      if (t.firstRequestedAt <= dr.at) {
        row(t.org, t.teamSlug).userDirectRequests += 1
      }
    }
  }

  let totalReviewsAfterAnyTeamRequestDelta = 0
  for (const rv of myReviews) {
    const teams = teamReqByPr.get(rv.prId)
    if (!teams || !rv.at) continue
    // any team requested before this review?
    if (teams.some((t) => rv.at! >= t.firstRequestedAt)) {
      totalReviewsAfterAnyTeamRequestDelta += 1
    }
  }

  let totalDirectRequestsAfterTeamRequestDelta = 0
  for (const dr of directUserRequests) {
    const firstReqAt = firstTeamReqAtByPr.get(dr.prId)
    if (firstReqAt && dr.at && dr.at >= firstReqAt) {
      totalDirectRequestsAfterTeamRequestDelta += 1
    }
  }

  return {
    rows: [...acc.values()],
    totalReviewsAfterAnyTeamRequestDelta,
    totalDirectRequestsAfterTeamRequestDelta,
  }
}
