import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  jsonOK,
  jsonUnauthorized,
  jsonBadRequest,
  jsonServerError,
} from '@/app/api/_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';
import { batchNormalizeUserPRs } from '@/lib/domains/normalizers/pr-normalizer';
import { batchNormalizeUserReviews } from '@/lib/domains/normalizers/review-normalizer';

const ADMIN_TENANT_ID = 'f7586fab-ea2d-4a9d-be3c-04be29ba071e';

export const GET = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    // Hard gate: only allow callers whose *own* tenant is the admin tenant.
    // If you have org/tenant membership tables, replace this check accordingly.
    if (session.user.id !== ADMIN_TENANT_ID) {
      return jsonUnauthorized('Unauthorized');
    }

    const { searchParams } = new URL(req.url);

    const tenantId = searchParams.get('tenantId');
    const username = searchParams.get('username');
    if (!tenantId || !username) {
      return jsonBadRequest('Missing tenantId or username.');
    }

    const startedAt = Date.now();

    const { touchedPrIds } = await batchNormalizeUserPRs(tenantId, username);
    await batchNormalizeUserReviews(tenantId, username, touchedPrIds);

    return jsonOK({
      ok: true,
      tenantId,
      username,
      durationMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    console.error('[internal normalize-prs] failed', {
      error: err?.message ?? String(err),
      stack: err?.stack,
    });
    return jsonServerError('Normalization failed.');
  }
});
