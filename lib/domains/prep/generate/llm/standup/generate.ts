import { runJsonLLM } from '@/lib/integrations/openai/services/runPrompt';
import { StandupLLMContext } from './types';
import { STANDUP_SCHEMA } from './schema';
import { AiConfig } from '@/lib/integrations/openai/config';
import { PrepLLMOutput } from '../../types';
import { buildStandupPrompt } from './prompt';

export async function generateStandup(
  ctx: StandupLLMContext
): Promise<PrepLLMOutput> {
  return runJsonLLM<StandupLLMContext, PrepLLMOutput>({
    name: 'standupTalkigPoints',
    schema: STANDUP_SCHEMA,
    buildMessages: buildStandupPrompt,
    model: AiConfig.models.summarize,
    temperature: 0.4,
    ctx,
  });
}
