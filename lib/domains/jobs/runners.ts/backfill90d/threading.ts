import { runThreadingPipelineOnce } from '@/lib/domains/threads/service/runThreadingPipeline';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { BackfillCursor } from './types';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SetupStateV1 } from '@/types/api/cli';

const DEFAULT_PER_RUN = 50;

export async function stepThreading(
  input: JobHandlerInput,
  cursor: BackfillCursor
): Promise<JobHandlerResult> {
  const { job, now } = input;
  const { tenantId } = job;

  const threadingParams = cursor.threading!;
  const perRun = threadingParams.perRun ?? DEFAULT_PER_RUN;
  const windowStart = new Date(cursor.windowStartISO);
  const windowEnd = new Date(cursor.windowEndISO);
  const result = await runThreadingPipelineOnce({
    tenantId,
    since: windowStart,
    end: windowEnd,
    now,
    limit: perRun,
    order: 'desc',
  });

  const done = result.claimedCount === 0;

  if (!done) {
    const nextCursor: BackfillCursor = {
      ...cursor,
      threading: {
        ...threadingParams,
        claimedCount: (threadingParams.claimedCount ?? 0) + result.claimedCount,
        eligibleCount:
          (threadingParams.eligibleCount ?? 0) + result.eligibleCount,
        ineligibleCount:
          (threadingParams.ineligibleCount ?? 0) + result.ineligibleCount,
        threadedCount:
          (threadingParams.threadedCount ?? 0) + result.threadedCount,
        deferredCount:
          (threadingParams.deferredCount ?? 0) + result.deferredCount,
      },
    };

    const nextCurrent =
      (threadingParams.claimedCount ?? 0) + result.claimedCount;
    return {
      outcome: 'requeue',
      cursor: nextCursor,
      progress: {
        step: 'threading',
        message: `Threading PRs (${nextCurrent})…`,
        current: nextCurrent,
      },
      nextRunAt: new Date(now.getTime() + 1_000),
    };
  } else {
    const [row] = await db
      .select({ setupState: users.setupState })
      .from(users)
      .where(eq(users.id, tenantId))
      .limit(1);

    const prev = row.setupState;

    const nextSetupState: SetupStateV1 = {
      ...prev,
      v: 1,
      backfill90d: {
        status: 'succeeded',
        updatedAt: now.toISOString(),
        lastError: undefined,
      },
      updatedAt: now.toISOString(),
    };

    await db
      .update(users)
      .set({
        setupState: nextSetupState,
        updatedAt: now,
      })
      .where(eq(users.id, tenantId));

    const nextCursor: BackfillCursor = {
      ...cursor,
      step: 'done',
    };
    return {
      outcome: 'complete',
      cursor: nextCursor,
      progress: {
        step: 'done',
        message: 'Backfill complete',
      },
    };
  }
}
