import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { jobs } from '@/lib/db/schema/jobs';
import { JobHandlerInput, JobHandlerResult } from './types';
import {
  markFailedNoRetry,
  markFailedOrRetry,
  markRequeued,
  markSucceeded,
} from '../db/updateJobStatus';

type JobRow = typeof jobs.$inferSelect;

export async function runClaimedJob(opts: {
  job: JobRow;
  db: PostgresJsDatabase<any>;
  dispatcherId: string;
  jobHandlers: Record<
    string,
    (i: JobHandlerInput) => Promise<JobHandlerResult>
  >;
  now?: Date;
}): Promise<{
  id: string;
  kind: JobRow['kind'];
  outcome: 'succeeded' | 'requeued' | 'retry' | 'failed';
  ms: number;
  nextRunAtISO?: string | null;
}> {
  const { job, db, dispatcherId, jobHandlers } = opts;
  const now = opts.now ?? new Date();

  const handler = jobHandlers[job.kind];

  if (!handler) {
    await markFailedNoRetry(
      job,
      `No handler registered for job kind: ${job.kind}`
    );

    return {
      id: job.id,
      kind: job.kind,
      outcome: 'failed',
      ms: 0,
      nextRunAtISO: null,
    };
  }

  const jobStart = Date.now();

  try {
    const res = await handler({
      job,
      now,
      db,
      dispatcherId,
    });

    if (res.outcome === 'complete') {
      await markSucceeded(job.id, {
        cursor: res.cursor,
        progress: res.progress,
        result: res.result,
      });

      return {
        id: job.id,
        kind: job.kind,
        outcome: 'succeeded',
        ms: Date.now() - jobStart,
        nextRunAtISO: null,
      };
    }

    await markRequeued(job.id, {
      nextRunAt: res.nextRunAt,
      cursor: res.cursor,
      progress: res.progress,
      result: res.result,
    });

    return {
      id: job.id,
      kind: job.kind,
      outcome: 'requeued',
      ms: Date.now() - jobStart,
      nextRunAtISO: (res.nextRunAt ?? null)?.toISOString?.() ?? null,
    };
  } catch (err) {
    const rr = await markFailedOrRetry(job, err);

    return {
      id: job.id,
      kind: job.kind,
      outcome: rr.outcome === 'retry' ? 'retry' : 'failed',
      ms: Date.now() - jobStart,
      nextRunAtISO: rr.nextRunAt ? rr.nextRunAt.toISOString() : null,
    };
  }
}
