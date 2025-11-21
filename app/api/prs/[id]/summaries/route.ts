import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '@/app/api/_lib/http';
import { loadPrSummaryContext } from '@/lib/integrations/openai/services/loadContext';
import { buildPRSummarizationInput } from '@/lib/integrations/openai/services/buildPRSummarizationInput';
import { getOrGeneratePrSummary } from '@/lib/integrations/openai/services/summarizePR';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const tenantId = session.user.id;

  const ctx = await loadPrSummaryContext({ tenantId, prId: params.id });
  if (!ctx) return jsonNotFound('PR not found');

  const input = buildPRSummarizationInput({
    normPr: ctx.normPr,
    files: ctx.files,
    reviews: ctx.reviews,
    reviewComments: ctx.reviewComments,
  });

  const { row } = await getOrGeneratePrSummary({
    tenantId,
    prId: params.id,
    input,
  });
  if (!row) return jsonBadRequest('Summary could not be created');
  return jsonOK(row);
}
