import {
  OneOnOneLLMContext,
  OneOnOneLLMOutput,
} from '@/lib/analysis/prep/one-on-ones/types';
import { buildTalkingPointsPrompt } from '../prompts/oneOnOneTalkingPoints';
import { AiConfig } from '../config';
import { openai } from '../client';
import { withRetry } from '../utils/retry';
import { safeJson } from '../utils/json';

export async function generateLLMTalkingPoints(
  ctx: OneOnOneLLMContext
): Promise<OneOnOneLLMOutput> {
  const messages = buildTalkingPointsPrompt(ctx);
  const run = () =>
    openai.chat.completions.create({
      model: AiConfig.models.summarize,
      temperature: 0.4,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'talkingPoints',
          schema: {
            type: 'object',
            properties: {
              talkingPoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    kind: {
                      type: 'string',
                      enum: [
                        'highlights',
                        'friction',
                        'asks',
                        'collaboration',
                        'growth',
                        'focus_areas',
                        'goals',
                      ],
                    },
                    title: { type: 'string' },
                    body: { type: 'string' },
                    order: { type: 'integer' },
                    relatedInsightIds: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    relatedMetricIds: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    relatedPrIds: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    relatedReviewIds: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: [
                    'id',
                    'kind',
                    'body',
                    'order',
                    'relatedInsightIds',
                    'relatedMetricIds',
                    'relatedPrIds',
                    'relatedReviewIds',
                    'title',
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ['talkingPoints'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
      messages,
    });

  const res = await withRetry(run);
  const content = res.choices[0]?.message?.content ?? '{}';
  return safeJson<OneOnOneLLMOutput>(content);
}
