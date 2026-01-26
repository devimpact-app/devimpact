import { NextRequest } from 'next/server';

import { db } from '@/lib/db/client';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '../_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';
import { EnqueueJobBodySchema } from '@/types/api/jobs';
import { auth } from '@/lib/auth';
import { enqueueJob } from '@/lib/domains/jobs/enqueue';

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
    const userId = session.user.id;
    const json = await req.json().catch(() => null);
    const parsed = EnqueueJobBodySchema.safeParse(json);

    if (!parsed.success) {
      return jsonBadRequest('Invalid request payload');
    }

    const { job, created } = await enqueueJob(db, {
      ...parsed.data,
      tenantId: userId,
    });

    return jsonOK({
      job,
      created,
    });
  } catch (err: any) {
    console.error('[ENQUEUE JOB] error:', err);
    return jsonServerError('Internal error');
  }
});
