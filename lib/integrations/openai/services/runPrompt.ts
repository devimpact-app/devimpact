import { openai } from '../client';
import { withRetry } from '../utils/retry';
import { safeJson } from '../utils/json';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

type JsonSchema = Record<string, any>;

export async function runJsonLLM<TCtx, TOut>(opts: {
  name: string;
  schema: JsonSchema;
  buildMessages: (ctx: TCtx) => ChatCompletionMessageParam[];
  model: string;
  temperature?: number;
  ctx: TCtx;
}): Promise<TOut> {
  const messages = opts.buildMessages(opts.ctx);

  const run = () =>
    openai.chat.completions.create({
      model: opts.model,
      temperature: opts.temperature ?? 0.4,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: opts.name,
          schema: opts.schema,
          strict: true,
        },
      },
      messages,
    });

  const res = await withRetry(run);
  const content = res.choices[0]?.message?.content ?? '{}';
  return safeJson<TOut>(content);
}
