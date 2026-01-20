import { JobHandlerInput, JobHandlerResult } from '../types';
import { stepDeriveEvents } from './derive';
import { stepNormalize } from './normalize';
import { stepSummarizePrs } from './summarizePrs';
import { stepThreading } from './threading';
import { BootstrapCursor, BootstrapCursorSchema } from './types';
import { stepWeeklySummary } from './weeklySummary';

function initBootstrapCursor(nowISO: string): BootstrapCursor {
  return {
    v: 1,
    step: 'normalize',
    lookbackDays: 14,
    startedAtISO: nowISO,
    summarize: {
      items: [],
      idx: 0,
      perRun: 5,
      concurrency: 5,
      succeeded: 0,
      failed: 0,
    },
  };
}

export async function handleSetupBootstrapRecent(
  input: JobHandlerInput
): Promise<JobHandlerResult> {
  const { job, now, db } = input;
  if (!job?.id || !job?.tenantId) {
    throw new Error('Invalid job row: missing id or tenantId');
  }
  if (job.kind !== 'setup_bootstrap_recent') {
    throw new Error(
      `handleSetupBootstrapRecent received wrong kind: ${job.kind}`
    );
  }

  const nowISO = now.toISOString();
  const cursorParsed = BootstrapCursorSchema.safeParse(job.cursor);
  const cursor = cursorParsed.success
    ? cursorParsed.data
    : initBootstrapCursor(nowISO);
  if (!cursorParsed.success) {
    throw new Error(`handleSetupBootstrapRecent parsing cursor failed`);
  }

  switch (cursor.step) {
    case 'normalize':
      return await stepNormalize(input, cursor);
    case 'derive_events':
      return await stepDeriveEvents(input, cursor);
    case 'summarize_prs':
      return await stepSummarizePrs(input, cursor);
    case 'threading':
      return await stepThreading(input, cursor);
    case 'weekly_summary':
      return await stepWeeklySummary(input, cursor);
    case 'done':
      return { outcome: 'complete', cursor, progress: { message: 'Done' } };
  }
}
