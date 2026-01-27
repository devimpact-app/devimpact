import { deriveActivityEventsFromPullRequests } from '@/lib/domains/activity/derive/from-github-prs';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { deriveActivityEventsFromReviews } from '@/lib/domains/activity/derive/from-github-reviews';
import { deriveActivityEventsFromCalendarEvents } from '@/lib/domains/activity/derive/from-calendar-events';
import { runThreadingPipeline } from '@/lib/domains/threads/service/runThreadingPipeline';
import { getPrsToSummarize } from '../../db/getPrsToSummarize';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '@/lib/domains/pull-requests/service/getOrGeneratePrSummary';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { batchNormalizeUserPRs } from '@/lib/domains/pull-requests/service/normalization/pr-normalizer';
import { batchNormalizeUserReviews } from '@/lib/domains/pull-requests/service/normalization/review-normalizer';

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

  const [user] = await db
    .select({ githubUsername: users.githubUsername })
    .from(users)
    .where(eq(users.id, tenantId))
    .limit(1);

  const username = user.githubUsername;

  // Normalize any new reviews/prs
  await batchNormalizeUserPRs(tenantId, username);
  await batchNormalizeUserReviews(tenantId, username);

  // Summarize recent prs
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

  // Threading
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
