import { persistBundles } from './persist-bundle';
import { RepoSyncPayload } from '@/types/api/sync';
import { getSyncStatus, isInitialSync, updateSyncStatus } from './sync-status';
import { upsertGithubRepoForTenant } from './upsert-repo';
import { enqueueJob, hourlyDedupeKey } from '@/lib/domains/jobs/enqueue';
import { db } from '@/lib/db/client';
import { User } from '@/lib/db/schema';

export async function runSync({
  user,
  payload,
}: {
  user: User;
  payload: RepoSyncPayload;
}) {
  const tenantId = user.id;
  const syncStatus = await getSyncStatus(tenantId);
  const initialSync = isInitialSync(syncStatus);
  const username = payload.githubLogin;

  // Save repo info if needed
  await upsertGithubRepoForTenant(tenantId, [payload.repo]);

  const { errors } = await persistBundles(
    tenantId,
    {
      fullName: payload.repo.fullName,
      owner: payload.repo.ownerLogin,
      name: payload.repo.name,
    },
    payload.pulls
  );

  if (payload.isLastBatch) {
    await updateSyncStatus({
      tenantId,
      syncWindow: payload.syncWindow,
      userLastSyncAt: syncStatus?.lastSyncAt,
    });
  }

  const userSetupFinished = !!user.setupState.ready;
  if (!userSetupFinished) {
    // Rest of processing will be picked up in bootstrap job
  } else {
    await enqueueJob(db, {
      tenantId,
      kind: 'threading_recent',
      dedupeKey: hourlyDedupeKey(),
    });
  }

  return {
    sync_type: initialSync ? 'initial' : 'incremental',
    errors,
    username,
    date_range: payload.syncWindow,
  };
}
