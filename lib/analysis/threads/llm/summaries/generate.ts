import { runJsonLLM } from '@/lib/integrations/openai/services/runPrompt';
import { AiConfig } from '@/lib/integrations/openai/config';
import { THREAD_SUMMARY_SCHEMA } from './schema';
import { ThreadSummaryLLMInput, ThreadSummaryOutput } from './types';
import { buildThreadSummaryPrompt } from './prompt';

export async function generateThreadSummary(
  ctx: ThreadSummaryLLMInput
): Promise<ThreadSummaryOutput> {
  return runJsonLLM<ThreadSummaryLLMInput, ThreadSummaryOutput>({
    name: 'threadSummary',
    schema: THREAD_SUMMARY_SCHEMA,
    buildMessages: buildThreadSummaryPrompt,
    model: AiConfig.models.summarize,
    temperature: 0.4,
    ctx,
  });
}
