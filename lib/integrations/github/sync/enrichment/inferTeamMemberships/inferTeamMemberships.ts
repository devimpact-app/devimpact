import { computeEvidenceCounts } from './computeEvidenceCounts'
import { upsertTeamMemberships } from './upsertTeamMemberships'

/**
 * Infer team memberships for users impacted by the given PRs.
 * Call this right after persist PR bundles
 */
export async function inferTeamMemberships(opts: {
  tenantId: string
  since?: Date
  username: string
}): Promise<{
  evidenceCount: number
}> {
  const { tenantId, since, username } = opts

  const {
    rows: evidenceDeltas,
    totalReviewsAfterAnyTeamRequestDelta,
    totalDirectRequestsAfterTeamRequestDelta,
  } = await computeEvidenceCounts({
    tenantId,
    username,
    since,
  })

  if (!evidenceDeltas.length) {
    return { evidenceCount: 0 }
  }

  await upsertTeamMemberships({
    tenantId,
    evidenceDeltas,
    totalReviewsAfterAnyTeamRequestDelta,
    totalDirectRequestsAfterTeamRequestDelta,
    source: 'heuristic',
    algoVersion: 'v1',
    username,
  })

  return {
    evidenceCount: evidenceDeltas.length,
  }
}
