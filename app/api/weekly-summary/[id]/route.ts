import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../_lib/http';
import { GetWeeklySummaryDetailResponseSchema } from '@/types/api/weekly-summary';
import { serializeWeeklySummaryRow } from '@/lib/analysis/weekly-summary/api/serializers';
import { getWeeklySummaryById } from '@/lib/analysis/weekly-summary/db/read/getWeeklySummaryById';

export const GET = withSentryUser(
  async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
    const tenantId = session.user.id;

    const { id } = await context.params;
    const summary = await getWeeklySummaryById({ tenantId, summaryId: id });

    if (!summary) return jsonNotFound('Weekly summary not found');

    const out = {
      summary: serializeWeeklySummaryRow(summary),
    };

    const parsed = GetWeeklySummaryDetailResponseSchema.safeParse(out);
    if (!parsed.success) {
      return jsonBadRequest('Failed to parse weekly summary detail response');
    }

    return jsonOK(parsed.data);
  }
);
