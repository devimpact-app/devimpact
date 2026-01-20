import { runWeeklySummary } from '@/lib/domains/weekly-summary/service/runWeeklySummary';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { BootstrapCursor } from './types';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
