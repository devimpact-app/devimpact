import { db } from '@/lib/db/client';
import { claimEligibleJobs } from '@/lib/domains/jobs/db/claimEligibleJobs';
import {
  markFailedNoRetry,
  markFailedOrRetry,
  markRequeued,
  markSucceeded,
} from '@/lib/domains/jobs/db/updateJobStatus';
import { jobHandlers } from '@/lib/domains/jobs/runners.ts/handleJob';
import { clampInt } from '@/lib/utils/math';
import { NextRequest } from 'next/server';
import { jsonOK, jsonServerError } from '../../_lib/http';

function isCronAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get('limit'), 3, 1, 20);
  const dispatcherId = process.env.VERCEL_REGION
    ? `vercel:${process.env.VERCEL_REGION}:${crypto.randomUUID()}`
    : `local:${crypto.randomUUID()}`;

  try {
    const claimedJobs = await claimEligibleJobs(db, {
      limit,
      dispatcherId,
      lockTtlMs: 6 * 60 * 1000, // 6 mins
    });

    const results = [];
    for (const job of claimedJobs) {
      const handler = jobHandlers[job.kind];

      if (!handler) {
        await markFailedNoRetry(
          job,
          `No handler registered for job kind: ${job.kind}`
        );
        results.push({
          id: job.id,
          kind: job.kind,
          outcome: 'failed' as const,
          ms: 0,
        });
        continue;
      }

      const jobStart = Date.now();

      try {
        const res = await handler({
          job,
          now: new Date(),
          db,
          dispatcherId,
        });

        if (res.outcome === 'complete') {
          await markSucceeded(job.id, {
            cursor: res.cursor,
            progress: res.progress,
            result: res.result,
          });
          results.push({
            id: job.id,
            kind: job.kind,
            outcome: 'succeeded' as const,
            ms: Date.now() - jobStart,
          });
          continue;
        }

        await markRequeued(job.id, {
          nextRunAt: res.nextRunAt,
          cursor: res.cursor,
          progress: res.progress,
          result: res.result,
        });

        // TODO (later): if res.enqueue exists, enqueue child jobs here via enqueueJob()

        results.push({
          id: job.id,
          kind: job.kind,
          outcome: 'requeued' as const,
          ms: Date.now() - jobStart,
        });
      } catch (err) {
        const rr = await markFailedOrRetry(job, err);
        results.push({
          id: job.id,
          kind: job.kind,
          outcome:
            rr.outcome === 'retry' ? ('retry' as const) : ('failed' as const),
          ms: Date.now() - jobStart,
          nextRunAt: rr.nextRunAt ? rr.nextRunAt.toISOString() : null,
        });
      }
    }

    return jsonOK({
      dispatcherId,
      claimed: claimedJobs.length,
      results,
    });
  } catch (e) {
    console.error('[CRON DISPATCH] error:', e);
    return jsonServerError('Internal error');
  }
}
