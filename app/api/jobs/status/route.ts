import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { NextRequest } from 'next/server';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '../../_lib/http';
import { JobStatusQuerySchema } from '@/types/api/jobs';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { jobs } from '@/lib/db/schema/jobs';
import { db } from '@/lib/db/client';

export const GET = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonUnauthorized('Unauthorized');
    }

    const url = new URL(req.url);
    const parsed = JobStatusQuerySchema.safeParse({
      kind: url.searchParams.get('kind'),
      dedupeKey: url.searchParams.get('dedupeKey') ?? undefined,
    });

    if (!parsed.success) {
      return jsonBadRequest('Invalid request');
    }

    const tenantId = session.user.id;
    const { kind, dedupeKey } = parsed.data;

    const baseWhere = and(
      eq(jobs.tenantId, tenantId),
      eq(jobs.kind, kind),
      ...(dedupeKey ? [eq(jobs.dedupeKey, dedupeKey)] : [])
    );

    const [active] = await db
      .select()
      .from(jobs)
      .where(and(baseWhere, inArray(jobs.status, ['queued', 'running'])))
      .orderBy(desc(jobs.updatedAt), desc(jobs.createdAt))
      .limit(1);

    if (active) {
      return jsonOK({ job: active });
    }

    const [latest] = await db
      .select()
      .from(jobs)
      .where(baseWhere)
      .orderBy(
        desc(jobs.finishedAt),
        desc(jobs.updatedAt),
        desc(jobs.createdAt)
      )
      .limit(1);

    return jsonOK({ job: latest ?? null });
  } catch (err) {
    console.error('[JOB STATUS] error:', err);
    return jsonServerError('Internal error');
  }
});
