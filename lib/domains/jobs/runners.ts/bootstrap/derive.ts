import { deriveActivityEventsFromPullRequests } from '@/lib/domains/activity/derive/from-github-prs';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { BootstrapCursor } from './types';
import { deriveActivityEventsFromReviews } from '@/lib/domains/activity/derive/from-github-reviews';

export async function stepDeriveEvents(
  input: JobHandlerInput,
  cursor: BootstrapCursor
): Promise<JobHandlerResult> {
  const { job, now } = input;
  const { tenantId } = job;

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

  const nextCursor: BootstrapCursor = {
    ...cursor,
    step: 'summarize_prs',
  };

  return {
    outcome: 'requeue',
    cursor: nextCursor,
    progress: {
      step: 'derive_events',
      message: 'Built activity timeline from pull requests and reviews',
    },
    nextRunAt: new Date(now.getTime() + 1_000),
  };
}
