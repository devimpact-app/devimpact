import { runJsonLLM } from '@/lib/integrations/openai/services/runPrompt';
import { PRSummarizationInput, PrSummaryResult } from './types';
import { AUTHORED_PR_SUMMARY_SCHEMA } from './schema';
import { AiConfig } from '@/lib/integrations/openai/config';
import { buildAuthoredPrSummaryPrompt } from './prompt';

export async function generateAuthoredPrSummary(
  ctx: PRSummarizationInput
): Promise<PrSummaryResult> {
  return runJsonLLM<PRSummarizationInput, PrSummaryResult>({
    name: 'authoredPrSummary',
    schema: AUTHORED_PR_SUMMARY_SCHEMA,
    buildMessages: buildAuthoredPrSummaryPrompt,
    model: AiConfig.models.summarize,
    temperature: 0.4,
    ctx,
  });
}
