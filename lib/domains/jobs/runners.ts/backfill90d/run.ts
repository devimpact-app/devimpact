import { JobHandlerInput, JobHandlerResult } from '../types';
import { stepSummarizePrs } from './summarizePrs';
import { stepThreading } from './threading';
import { BackfillCursor, BackfillCursorSchema } from './types';

const DEFAULT_LOOKBACK_DAYS = 90;

function isEmptyObject(rawObject: unknown) {
  return (
    rawObject &&
    typeof rawObject === 'object' &&
    !Array.isArray(rawObject) &&
    Object.keys(rawObject as any).length === 0
  );
}

function initBackfillCursor(
  windowStart: string,
  windowEnd: string
): BackfillCursor {
  return {
    v: 1,
    step: 'summarize_prs',
    windowStartISO: windowStart,
    windowEndISO: windowEnd,
    lookbackDays: DEFAULT_LOOKBACK_DAYS,
    summarize: {
      pass: 0,
      perRun: 10,
      concurrency: 5,
      succeeded: 0,
      failed: 0,
    },
    threading: {
      claimedCount: 0,
      perRun: 50,
      eligibleCount: 0,
      ineligibleCount: 0,
      deferredCount: 0,
      threadedCount: 0,
    },
  };
}

export async function handleBackfill90d(
  input: JobHandlerInput
): Promise<JobHandlerResult> {
  const { job, now, db } = input;
  if (!job?.id || !job?.tenantId) {
    throw new Error('Invalid job row: missing id or tenantId');
  }
  if (job.kind !== 'setup_backfill_90d') {
    throw new Error(`handleBackfill90d received wrong kind: ${job.kind}`);
  }

  const lookbackDays = DEFAULT_LOOKBACK_DAYS;
  const start = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const end = now;

  const rawCursor = job.cursor as unknown;
  let cursor: BackfillCursor;
  if (rawCursor == null || isEmptyObject(rawCursor)) {
    cursor = initBackfillCursor(start.toISOString(), end.toISOString());
  } else {
    const parsed = BackfillCursorSchema.safeParse(rawCursor);
    if (!parsed.success) {
      throw new Error('handleBackfill90d parsing cursor failed');
    }
    cursor = parsed.data;
  }

  switch (cursor.step) {
    case 'summarize_prs':
      return await stepSummarizePrs(input, cursor);
    case 'threading':
      return await stepThreading(input, cursor);
    case 'done':
      return { outcome: 'complete', cursor, progress: { message: 'Done' } };
  }
}
