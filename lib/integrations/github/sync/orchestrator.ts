import { batchNormalizeUserPRs } from "@/lib/analysis/normalizers/pr-normalizer";
import { persistBundles } from "./persist-bundle";
import { inferTeamMemberships } from "./enrichment/inferTeamMemberships/inferTeamMemberships";
import { batchNormalizeUserReviews } from "@/lib/analysis/normalizers/review-normalizer";
import { RepoSyncPayload } from "@/types/api/sync";
import { getSyncStatus, isInitialSync, updateSyncStatus } from "./sync-status";
import { upsertGithubRepoForTenant } from "./upsert-repo";

export async function runSync({
  tenantId,
  payload,
}: {
  tenantId: string;
  payload: RepoSyncPayload;
}) {
  const username = payload.githubLogin;
  const syncStatus = await getSyncStatus(tenantId);
  const initialSync = isInitialSync(syncStatus);
  const since = new Date(payload.syncWindow.startISO);

  // Save repo info if needed
  await upsertGithubRepoForTenant(tenantId, payload.repo);

  const { prIds, errors } = await persistBundles(
    tenantId,
    {
      fullName: payload.repo.fullName,
      owner: payload.repo.ownerLogin,
      name: payload.repo.name,
    },
    payload.pulls,
  );

  // Normalization and enrichment
  if (payload.isLastBatch) {
    await inferTeamMemberships({
      tenantId,
      prIdsChanged: prIds,
      since,
      username,
    });
    await batchNormalizeUserPRs(tenantId, username);
    await batchNormalizeUserReviews(tenantId, username);

    await updateSyncStatus({
      tenantId,
      syncWindow: payload.syncWindow,
      userLastSyncAt: syncStatus?.lastSyncAt,
    });
  }

  // TODO: PR summarization - queue in background or do here?

  return {
    sync_type: initialSync ? "initial" : "incremental",
    errors,
    username,
    date_range: payload.syncWindow,
  };
}
