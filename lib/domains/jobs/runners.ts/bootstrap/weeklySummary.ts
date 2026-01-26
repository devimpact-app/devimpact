import { runWeeklySummary } from '@/lib/domains/weekly-summary/service/runWeeklySummary';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { BootstrapCursor } from './types';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SetupStateV1 } from '@/types/api/cli';
import { enqueueJob } from '../../enqueue';

export async function stepWeeklySummary(
  input: JobHandlerInput,
  cursor: BootstrapCursor
): Promise<JobHandlerResult> {
  const { job, db, now } = input;
  const { tenantId } = job;

  const [user] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, tenantId))
    .limit(1);

  if (!user?.timezone) {
    throw new Error('Cannot generate weekly summary: user timezone not set');
  }

  await runWeeklySummary({
    tenantId,
    timezone: user.timezone,
  });

  const [row] = await db
    .select({ setupState: users.setupState })
    .from(users)
    .where(eq(users.id, tenantId))
    .limit(1);

  const prev = row.setupState;

  const nextSetupState: SetupStateV1 = {
    ...prev,
    v: 1,
    bootstrapRecent: {
      status: 'succeeded',
      updatedAt: now.toISOString(),
      lastError: undefined,
    },
    ready: true,
    updatedAt: now.toISOString(),
  };

  await db
    .update(users)
    .set({
      setupState: nextSetupState,
      updatedAt: now,
    })
    .where(eq(users.id, tenantId));

  // Queue up rest of 90 day backfill
  await enqueueJob(db, {
    tenantId,
    kind: 'setup_backfill_90d',
    dedupeKey: 'backfill_90d',
  });

  const nextCursor: BootstrapCursor = {
    ...cursor,
    step: 'done',
  };

  return {
    outcome: 'complete',
    cursor: nextCursor,
    progress: {
      step: 'weekly_summary',
      message: 'Generated initial weekly summary',
    },
  };
}
