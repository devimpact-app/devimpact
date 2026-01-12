import { runJsonLLM } from '@/lib/integrations/openai/services/runPrompt';
import { AiConfig } from '@/lib/integrations/openai/config';
import { WEEKLY_SUMMARY_SCHEMA } from './schema';
import { WeeklySummaryLLMInput, WeeklySummaryOutput } from './types';

export async function generateWeeklySummary(
  ctx: WeeklySummaryLLMInput
): Promise<WeeklySummaryOutput> {
  return runJsonLLM<WeeklySummaryLLMInput, WeeklySummaryOutput>({
    name: 'weeklySummary',
    schema: WEEKLY_SUMMARY_SCHEMA,
    buildMessages: buildThreadSummaryPrompt,
    model: AiConfig.models.summarize,
    temperature: 0.4,
    ctx,
  });
}
