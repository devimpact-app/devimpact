import { runJsonLLM } from '@/lib/integrations/openai/services/runPrompt';
import { PRSummarizationInput, PrSummaryResult } from './types';
import { PR_SUMMARY_SCHEMA } from './schema';
import { AiConfig } from '@/lib/integrations/openai/config';
import { buildPrSummaryPrompt } from './prompt';

export async function generatePrSummary(
  ctx: PRSummarizationInput
): Promise<PrSummaryResult> {
  return runJsonLLM<PRSummarizationInput, PrSummaryResult>({
    name: 'authoredPrSummary',
    schema: PR_SUMMARY_SCHEMA,
    buildMessages: buildPrSummaryPrompt,
    model: AiConfig.models.summarize,
    temperature: 0.4,
    ctx,
  });
}
