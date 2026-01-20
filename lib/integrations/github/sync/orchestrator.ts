import { batchNormalizeUserPRs } from '@/lib/domains/pull-requests/service/normalization/pr-normalizer';
import { persistBundles } from './persist-bundle';
import { batchNormalizeUserReviews } from '@/lib/domains/pull-requests/service/normalization/review-normalizer';
import { RepoSyncPayload } from '@/types/api/sync';
import { getSyncStatus, isInitialSync, updateSyncStatus } from './sync-status';
import { upsertGithubRepoForTenant } from './upsert-repo';
import {
  getDefaultWeekOffset,
  getWeekBoundsFromOffset,
} from '@/lib/utils/date';
import { getAuthoredPrs } from '@/lib/domains/timeline/db/getAuthoredPrs';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '@/lib/domains/pull-requests/service/getOrGeneratePrSummary';
import { deriveActivityEventsFromPullRequests } from '@/lib/domains/activity/derive/from-github-prs';
import { deriveActivityEventsFromReviews } from '@/lib/domains/activity/derive/from-github-reviews';
import { runThreadingPipeline } from '@/lib/domains/threads/service/runThreadingPipeline';

export async function runSync({
  tenantId,
  payload,
}: {
  tenantId: string;
  payload: RepoSyncPayload;
}) {
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

  // Normalization and enrichment
  if (payload.isLastBatch) {
    // Normalize to nice tables for GH
    const { touchedPrIds } = await batchNormalizeUserPRs(tenantId, username);
    const { touchedReviewIds } = await batchNormalizeUserReviews(
      tenantId,
      username
    );

    // Derive activity events (ledger) for accomplishment logging
    await deriveActivityEventsFromPullRequests({
      tenantId,
      authoredOnly: true,
    });
    await deriveActivityEventsFromReviews({
      tenantId,
      joinPrTitle: true,
    });
    await runThreadingPipeline({
      tenantId,
      lookbackDays: 14,
    });

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
  }

  return {
    sync_type: initialSync ? 'initial' : 'incremental',
    errors,
    username,
    date_range: payload.syncWindow,
  };
}
