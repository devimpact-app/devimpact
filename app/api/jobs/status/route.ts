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
import { db } from '@/lib/db/client';
import { getJobStatusForTenant } from '@/lib/domains/jobs/db/getJobStatus';

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

    const job = await getJobStatusForTenant(db, { tenantId, kind, dedupeKey });
    return jsonOK({ job });
  } catch (err) {
    console.error('[JOB STATUS] error:', err);
    return jsonServerError('Internal error');
  }
});
