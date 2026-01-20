import { deriveActivityEventsFromPullRequests } from '@/lib/domains/activity/derive/from-github-prs';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { deriveActivityEventsFromReviews } from '@/lib/domains/activity/derive/from-github-reviews';
import { deriveActivityEventsFromCalendarEvents } from '@/lib/domains/activity/derive/from-calendar-events';
import { runThreadingPipeline } from '@/lib/domains/threads/service/runThreadingPipeline';
import { getPrsToSummarize } from '../../db/getPrsToSummarize';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '@/lib/domains/pull-requests/service/getOrGeneratePrSummary';

export async function handleThreadingRecent(
  input: JobHandlerInput
): Promise<JobHandlerResult> {
  const { job, now } = input;
  if (!job?.id || !job?.tenantId) {
    throw new Error('Invalid job row: missing id or tenantId');
  }
  if (job.kind !== 'threading_recent') {
    throw new Error(`handleThreadingRecent received wrong kind: ${job.kind}`);
  }
  const { tenantId } = job;

  const lookbackDays = 14;
  const start = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const items = await getPrsToSummarize({
    tenantId,
    start,
    end: now,
    limit: 50,
  });
  let summaryFailed = 0;
  await mapWithConcurrency(items, 5, async (item) => {
    try {
      await getOrGeneratePrSummary({
        tenantId,
        prId: item.prId,
        useReviewedPrompt: item.mode === 'reviewed',
      });
    } catch (e) {
      summaryFailed += 1;
      console.error('[THREADING RECENT] summarize failed', {
        tenantId,
        prId: item.prId,
        mode: item.mode,
        err: e,
      });
    }
  });

  if (summaryFailed > 0) {
    throw new Error(
      `threading_recent: ${summaryFailed}/${items.length} PR summaries failed`
    );
  }

  await deriveActivityEventsFromPullRequests({
    tenantId,
    authoredOnly: true,
    now,
  });
  await deriveActivityEventsFromReviews({
    tenantId,
    reviewerOnly: true,
    joinPrTitle: true,
    now,
  });
  await deriveActivityEventsFromCalendarEvents({
    tenantId,
    lookbackDays,
    pastOnly: true,
  });

  await runThreadingPipeline({
    tenantId,
    lookbackDays,
  });

  return {
    outcome: 'complete',
    progress: {
      step: 'threading_recent',
      message: `Threaded last ${lookbackDays} days`,
    },
  };
}
