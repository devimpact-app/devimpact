import { auth } from '@/lib/auth';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '../../_lib/http';
import {
  MetricsBatchInput,
  MetricsBatchResult,
  TMetricsBatchInput,
  TMetricsBatchResult,
} from '@/types/api/metrics';
import { runBatchServer } from '@/lib/domains/metrics/runBatchServer';
import { withSentryUser } from '@/lib/withSentryUser';
import { NextRequest } from 'next/server';

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonUnauthorized();
    }
    const tenantId = session.user.id;

    // Parse input
    const json = await req.json();
    const parse = MetricsBatchInput.safeParse(json);
    if (!parse.success) {
      return jsonBadRequest('Invalid input shape');
    }
    const body: TMetricsBatchInput = parse.data;

    const { results }: TMetricsBatchResult = await runBatchServer(
      body,
      tenantId
    );
    const out = MetricsBatchResult.parse({ results });
    return jsonOK(out);
  } catch (err) {
    console.error('/api/metrics/query error', err);
    return jsonServerError('Internal error');
  }
});
