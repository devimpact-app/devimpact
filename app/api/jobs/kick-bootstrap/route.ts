import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { jobHandlers } from '@/lib/domains/jobs/runners.ts/handleJob';
import { runClaimedJob } from '@/lib/domains/jobs/runners.ts/runClaimedJob';
import { jsonUnauthorized, jsonServerError, jsonOK } from '../../_lib/http';
import { claimEligibleJobs } from '@/lib/domains/jobs/db/claimEligibleJobs';

const BOOTSTRAP_KIND = 'setup_bootstrap_recent' as const;
const BOOTSTRAP_DEDUPE_KEY = 'bootstrap_recent';

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const tenantId = session.user.id;
    const now = new Date();
    const handler = jobHandlers[BOOTSTRAP_KIND];

    if (!handler) {
      return jsonServerError(`No handler registered for ${BOOTSTRAP_KIND}`);
    }

    const [job] = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.tenantId, tenantId),
          eq(jobs.kind, BOOTSTRAP_KIND),
          eq(jobs.dedupeKey, BOOTSTRAP_DEDUPE_KEY),
          eq(jobs.status, 'queued')
        )
      )
      .orderBy(jobs.nextRunAt) // oldest first
      .limit(1);

    if (!job) {
      const [running] = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.tenantId, tenantId),
            eq(jobs.kind, BOOTSTRAP_KIND),
            eq(jobs.dedupeKey, BOOTSTRAP_DEDUPE_KEY),
            eq(jobs.status, 'running')
          )
        )
        .limit(1);

      return jsonOK({ ok: true, dispatched: false, job: running ?? null });
    }

    const dispatcherId = process.env.VERCEL_REGION
      ? `kick:${process.env.VERCEL_REGION}:${crypto.randomUUID()}`
      : `kick:local:${crypto.randomUUID()}`;
    const lockTtlMs = 6 * 60 * 1000;
    const [claimed] = await claimEligibleJobs(db, {
      limit: 1,
      dispatcherId,
      lockTtlMs,
      jobId: job.id,
      status: 'queued',
    });
    if (!claimed) {
      const [latest] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, job.id))
        .limit(1);

      return jsonOK({ ok: true, dispatched: false, job: latest ?? null });
    }

    const r = await runClaimedJob({
      job: claimed,
      db,
      dispatcherId,
      jobHandlers,
    });
    return jsonOK({ ok: true, result: r });
  } catch (err: any) {
    console.error('[KICK BOOTSTRAP] error:', err);
    return jsonServerError('Internal error');
  }
});
