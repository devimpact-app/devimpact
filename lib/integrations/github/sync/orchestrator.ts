import { batchNormalizeUserPRs } from '@/lib/analysis/normalizers/pr-normalizer';
import { persistBundles } from './persist-bundle';
import { inferTeamMemberships } from './enrichment/inferTeamMemberships/inferTeamMemberships';
import { batchNormalizeUserReviews } from '@/lib/analysis/normalizers/review-normalizer';
import { RepoSyncPayload } from '@/types/api/sync';
import { getSyncStatus, isInitialSync, updateSyncStatus } from './sync-status';
import { upsertGithubRepoForTenant } from './upsert-repo';

export async function runSync({
  tenantId,
  payload,
}: {
  tenantId: string;
  payload: RepoSyncPayload;
}) {
  const syncStatus = await getSyncStatus(tenantId);
  const initialSync = isInitialSync(syncStatus);
  const since = new Date(payload.syncWindow.startISO);
  const username = payload.githubLogin;

  // Save repo info if needed
  await upsertGithubRepoForTenant(tenantId, payload.repo);

  const { errors } = await persistBundles(
    tenantId,
    {
      fullName: payload.repo.fullName,
      owner: payload.repo.ownerLogin,
      name: payload.repo.name,
    },
    payload.pulls
  );

  // Normalization and enrichment
  if (payload.isLastBatch) {
    await inferTeamMemberships({
      tenantId,
      since,
      username,
    });

    const normalizedPrIds = await batchNormalizeUserPRs(tenantId, username);
    await batchNormalizeUserReviews(tenantId, username, normalizedPrIds);

    await updateSyncStatus({
      tenantId,
      syncWindow: payload.syncWindow,
      userLastSyncAt: syncStatus?.lastSyncAt,
    });
  }

  // TODO:
  // See what week will be shown on dashboard first - do PR summaries for that week
  // Queue up rest of last 4 weeks of PR summaries in background

  return {
    sync_type: initialSync ? 'initial' : 'incremental',
    errors,
    username,
    date_range: payload.syncWindow,
  };
}
