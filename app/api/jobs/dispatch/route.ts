import { db } from '@/lib/db/client';
import { claimEligibleJobs } from '@/lib/domains/jobs/db/claimEligibleJobs';
import { jobHandlers } from '@/lib/domains/jobs/runners.ts/handleJob';
import { clampInt } from '@/lib/utils/math';
import { NextRequest } from 'next/server';
import { jsonOK, jsonServerError } from '../../_lib/http';
import { runClaimedJob } from '@/lib/domains/jobs/runners.ts/runClaimedJob';

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
      const r = await runClaimedJob({
        job,
        db,
        dispatcherId,
        jobHandlers,
      });
      results.push(r);
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
