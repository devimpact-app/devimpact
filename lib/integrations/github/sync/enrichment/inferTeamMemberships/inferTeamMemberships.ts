import { computeEvidenceCounts } from "./computeEvidenceCounts";
import { upsertTeamMemberships } from "./upsertTeamMemberships";

/**
 * Infer team memberships for users impacted by the given PRs.
 * Call this right after persist PR bundles
 */
export async function inferTeamMemberships(opts: {
  tenantId: string;
  prIdsChanged: string[]; // PRs just persisted/updated
  since?: Date; // e.g. new Date(Date.now() - 90*864e5)
  username: string;
}): Promise<{
  evidenceCount: number;
}> {
  const { tenantId, prIdsChanged, since, username } = opts;

  if (!prIdsChanged?.length) {
    return { evidenceCount: 0 };
  }

  const evidence = await computeEvidenceCounts({
    tenantId,
    username,
    since,
  });

  if (!evidence.length) {
    return { evidenceCount: 0 };
  }

  // Upsert inferred memberships
  await upsertTeamMemberships({
    tenantId,
    evidence,
    source: "heuristic",
    algoVersion: "v1",
  });

  return {
    evidenceCount: evidence.length,
  };
}
