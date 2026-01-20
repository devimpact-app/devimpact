import { runThreadingPipeline } from '@/lib/domains/threads/service/runThreadingPipeline';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { BootstrapCursor } from './types';

export async function stepThreading(
  input: JobHandlerInput,
  cursor: BootstrapCursor
): Promise<JobHandlerResult> {
  const { job, now } = input;
  const { tenantId } = job;

  const lookbackDays = cursor.lookbackDays ?? 14;

  await runThreadingPipeline({
    tenantId,
    lookbackDays,
  });

  const nextCursor: BootstrapCursor = {
    ...cursor,
    step: 'weekly_summary',
  };

  return {
    outcome: 'requeue',
    cursor: nextCursor,
    progress: {
      step: 'threading',
      message: 'Generated threads from recent activity',
    },
    nextRunAt: new Date(now.getTime() + 1_000),
  };
}
