import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '@/app/api/_lib/http';
import { getOrGeneratePrSummary } from '@/lib/integrations/openai/services/summarizePR';
import { withSentryUser } from '@/lib/withSentryUser';

export const POST = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const tenantId = session.user.id;

    const { row } = await getOrGeneratePrSummary({
      tenantId,
      prId: params.id,
    });
    if (!row) return jsonBadRequest('Summary could not be created');
    return jsonOK(row);
  }
);
