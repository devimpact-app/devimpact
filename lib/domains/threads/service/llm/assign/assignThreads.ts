import { runJsonLLM } from '@/lib/integrations/openai/services/runPrompt';
import { AiConfig } from '@/lib/integrations/openai/config';
import { buildThreadAssignmentPrompt } from './prompt';
import { THREAD_ASSIGNMENT_SCHEMA } from './schema';
import { AssignThreadsInput, AssignThreadsOutput } from './types';

export async function assignThreads(
  ctx: AssignThreadsInput
): Promise<AssignThreadsOutput> {
  return runJsonLLM<AssignThreadsInput, AssignThreadsOutput>({
    name: 'threadAssignment',
    schema: THREAD_ASSIGNMENT_SCHEMA,
    buildMessages: buildThreadAssignmentPrompt,
    model: AiConfig.models.summarize,
    temperature: 0.4,
    ctx,
  });
}
