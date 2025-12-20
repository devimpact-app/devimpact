import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  jsonOK,
  jsonUnauthorized,
  jsonBadRequest,
  jsonServerError,
} from '@/app/api/_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';

import {
  PrepGenerateRequestSchema,
  type PrepGenerateRequest,
} from '@/types/api/prep';
import { createPendingPrepItem } from '@/lib/analysis/prep/generate/createPending';

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonBadRequest('Invalid JSON body.');
    }

    const parsed = PrepGenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[prep.generate] invalid request', {
        issues: parsed.error.issues,
      });
      return jsonBadRequest('Invalid request.', {
        issues: parsed.error.issues,
      });
    }

    const input: PrepGenerateRequest = parsed.data;

    const result = await createPendingPrepItem({
      tenantId: session.user.id,
      input,
    });

    return jsonOK(result);
  } catch (err: any) {
    console.error('[prep.generate] failed', {
      error: err?.message ?? String(err),
      stack: err?.stack,
    });
    return jsonServerError('Failed to generate prep.');
  }
});
