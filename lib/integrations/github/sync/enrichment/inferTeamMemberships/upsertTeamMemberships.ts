import { db } from '@/lib/db/client'
import { EvidenceRow } from './computeEvidenceCounts'
import { inferredTeamMemberships } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

type Confidence = 'low' | 'medium' | 'high'

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function computeScore({
  reqToReview,
  userDirectRequests,
  totalDirectRequestsAfterTeamRequest,
  totalReviewsAfterAnyTeamRequest,
}: {
  reqToReview: number
  userDirectRequests: number
  totalReviewsAfterAnyTeamRequest: number
  totalDirectRequestsAfterTeamRequest: number
}): number {
  const reviewDenom = Math.max(1, totalReviewsAfterAnyTeamRequest)
  const followShare = reqToReview / reviewDenom

  const directDenom = Math.max(1, totalDirectRequestsAfterTeamRequest)
  const directShare = userDirectRequests / directDenom // 0..1

  // weights: mostly behavior, some boost for direct requests
  return clamp01(0.8 * followShare + 0.2 * directShare)
}

function toConfidence(score: number): Confidence {
  if (score >= 0.7) return 'high'
  if (score >= 0.4) return 'medium'
  return 'low'
}

export async function upsertTeamMemberships(opts: {
  tenantId: string
  evidenceDeltas: EvidenceRow[]
  totalReviewsAfterAnyTeamRequestDelta: number
  totalDirectRequestsAfterTeamRequestDelta: number
  algoVersion?: string
  source?: 'heuristic' | 'api'
  username: string
}) {
  const {
    tenantId,
    evidenceDeltas,
    algoVersion = 'v1',
    source = 'heuristic',
    totalDirectRequestsAfterTeamRequestDelta,
    totalReviewsAfterAnyTeamRequestDelta,
    username,
  } = opts
  if (!evidenceDeltas?.length) return

  const now = new Date()

  const existingRows = await db
    .select()
    .from(inferredTeamMemberships)
    .where(
      and(
        eq(inferredTeamMemberships.tenantId, tenantId),
        eq(inferredTeamMemberships.githubLogin, username),
        eq(inferredTeamMemberships.source, source)
      )
    )

  const existingByKey = new Map<string, (typeof existingRows)[number]>()
  for (const r of existingRows) {
    const key = `${r.org}::${r.teamSlug}`
    existingByKey.set(key, r)
  }

  const prevGlobalTotal =
    existingRows[0]?.evidenceCounts.totalReviewsAfterAnyTeamRequest ?? 0

  const newGlobalTotal = prevGlobalTotal + totalReviewsAfterAnyTeamRequestDelta
  const prevDirectTotal =
    existingRows[0]?.evidenceCounts.totalDirectRequestsAfterTeamRequest ?? 0
  const newDirectTotal =
    prevDirectTotal + totalDirectRequestsAfterTeamRequestDelta

  for (const delta of evidenceDeltas) {
    const key = `${delta.org}::${delta.teamSlug}`
    const existing = existingByKey.get(key)

    const prevCounts = existing?.evidenceCounts ?? {
      reqToReview: 0,
      userDirectRequests: 0,
      totalDirectRequestsAfterTeamRequest: prevDirectTotal,
      totalReviewsAfterAnyTeamRequest: prevGlobalTotal,
    }

    const mergedCounts = {
      reqToReview: prevCounts.reqToReview + delta.reqToReview,
      userDirectRequests:
        prevCounts.userDirectRequests + delta.userDirectRequests,
      totalReviewsAfterAnyTeamRequest: newGlobalTotal,
      totalDirectRequestsAfterTeamRequest: newDirectTotal,
    }
    const score = computeScore(mergedCounts)
    const confidence = toConfidence(score)

    await db
      .insert(inferredTeamMemberships)
      .values({
        tenantId,
        githubLogin: username,
        org: delta.org,
        teamSlug: delta.teamSlug,
        source,
        algoVersion,
        score,
        confidence,
        evidenceCounts: mergedCounts,
        lastSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          inferredTeamMemberships.tenantId,
          inferredTeamMemberships.githubLogin,
          inferredTeamMemberships.org,
          inferredTeamMemberships.teamSlug,
          inferredTeamMemberships.source,
        ],
        set: {
          algoVersion,
          score,
          confidence,
          evidenceCounts: mergedCounts,
          lastSeenAt: now,
          updatedAt: now,
        },
      })
  }
}
