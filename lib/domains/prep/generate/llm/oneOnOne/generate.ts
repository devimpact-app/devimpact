import { runJsonLLM } from '@/lib/integrations/openai/services/runPrompt';
import { OneOnOneLLMContext } from './types';
import { ONE_ON_ONE_SCHEMA } from './schema';
import { buildOneOnOnePrompt } from './prompt';
import { AiConfig } from '@/lib/integrations/openai/config';
import { PrepLLMOutput } from '../../types';

export async function generateOneOnOneTalkingPoints(
  ctx: OneOnOneLLMContext
): Promise<PrepLLMOutput> {
  return runJsonLLM<OneOnOneLLMContext, PrepLLMOutput>({
    name: 'oneOnOneTalkingPoints',
    schema: ONE_ON_ONE_SCHEMA,
    buildMessages: buildOneOnOnePrompt,
    model: AiConfig.models.summarize,
    temperature: 0.4,
    ctx,
  });
}
