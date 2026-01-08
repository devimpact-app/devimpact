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
import { getAuthoredPrs } from '@/lib/analysis/timeline/getAuthoredPrs';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '../../openai/services/summarizePR';
import { deriveActivityEventsFromPullRequestIds } from '@/lib/analysis/activity/derive/from-github-prs';
import { deriveActivityEventsFromReviewIds } from '@/lib/analysis/activity/derive/from-github-reviews';
import { runThreadingPipeline } from '@/lib/analysis/threads/runThreadingPipeline';

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
    await inferTeamMemberships({
      tenantId,
      since,
      username,
    });

    // Normalize to nice tables for GH
    const { rawGithubPrIds, touchedPrIds } = await batchNormalizeUserPRs(
      tenantId,
      username
    );
    const { touchedReviewIds } = await batchNormalizeUserReviews(
      tenantId,
      username,
      rawGithubPrIds
    );

    // Derive activity events (ledger) for accomplishment logging
    await deriveActivityEventsFromPullRequestIds({
      tenantId,
      prIds: touchedPrIds,
      authoredOnly: true,
    });
    await deriveActivityEventsFromReviewIds({
      tenantId,
      reviewIds: touchedReviewIds,
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
