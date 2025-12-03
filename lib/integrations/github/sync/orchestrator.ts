import { batchNormalizeUserPRs } from '@/lib/analysis/normalizers/pr-normalizer';
import { persistBundles } from './persist-bundle';
import { inferTeamMemberships } from './enrichment/inferTeamMemberships/inferTeamMemberships';
import { batchNormalizeUserReviews } from '@/lib/analysis/normalizers/review-normalizer';
import { RepoSyncPayload } from '@/types/api/sync';
import { getSyncStatus, isInitialSync, updateSyncStatus } from './sync-status';
import { upsertGithubRepoForTenant } from './upsert-repo';
import {
  getDefaultWeekOffset,
  getWeekBoundsFromOffset,
} from '@/lib/utils/date';
import { getAuthoredPrs } from '@/lib/analysis/activity/getAuthoredPrs';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '../../openai/services/summarizePR';

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

    // Summarize PRs for week that will be shown first
    const weekOffset = getDefaultWeekOffset();
    const { start, end } = getWeekBoundsFromOffset(weekOffset);
    const authoredPrs = await getAuthoredPrs({
      tenantId,
      start,
      end,
    });
    const mergedPrs = authoredPrs.filter((pr) => !!pr.mergedAt);
    await mapWithConcurrency(mergedPrs, 5, async (pr) => {
      const { row } = await getOrGeneratePrSummary({
        tenantId,
        prId: pr.id,
      });
      return { prId: pr.id, row };
    });

    await updateSyncStatus({
      tenantId,
      syncWindow: payload.syncWindow,
      userLastSyncAt: syncStatus?.lastSyncAt,
    });

    // TODO:
    // Queue up rest of last 4 weeks of PR summaries in background
  }

  return {
    sync_type: initialSync ? 'initial' : 'incremental',
    errors,
    username,
    date_range: payload.syncWindow,
  };
}
