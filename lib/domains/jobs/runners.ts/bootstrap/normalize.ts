import { users } from '@/lib/db/schema';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { BootstrapCursor } from './types';
import { eq } from 'drizzle-orm';
import { batchNormalizeUserPRs } from '@/lib/domains/pull-requests/service/normalization/pr-normalizer';
import { batchNormalizeUserReviews } from '@/lib/domains/pull-requests/service/normalization/review-normalizer';

export async function stepNormalize(
  input: JobHandlerInput,
  cursor: BootstrapCursor
): Promise<JobHandlerResult> {
  const { job, db, now } = input;
  const { tenantId } = job;

  const [user] = await db
    .select({ githubUsername: users.githubUsername })
    .from(users)
    .where(eq(users.id, tenantId))
    .limit(1);

  if (!user?.githubUsername) {
    throw new Error('Cannot bootstrap: GitHub username not found for user');
  }
  const username = user.githubUsername;

  const { touchedPrIds } = await batchNormalizeUserPRs(tenantId, username);
  const { touchedReviewIds } = await batchNormalizeUserReviews(
    tenantId,
    username
  );
  const nextCursor: BootstrapCursor = {
    ...cursor,
    step: 'derive_events',
    normalize: {
      touchedPrIds,
      touchedReviewIds,
    },
  };

  return {
    outcome: 'requeue',
    cursor: nextCursor,
    progress: {
      step: 'normalize',
      message: 'Normalized GitHub pull requests and reviews',
    },
    nextRunAt: new Date(now.getTime() + 1_000),
  };
}
