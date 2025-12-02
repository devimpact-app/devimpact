import { DB } from '@/lib/db/client';
import { NewOneOnOneSession } from '@/lib/db/schema/prep';
import { weeksAgo } from '@/lib/utils/date';
import {
  OneOnOneTalkingPoint,
  TCreateOneOnOneInput,
} from '@/types/api/one-on-one';
import { OneOnOneLLMContext, OneOnOneLLMOutput } from './types';
import { fetchMetricsForWindows } from './metrics';
import { fetchInsightsForWindow } from './insights';
import { getActivityForOneOnOneRange } from './activity';
import { buildTalkingPointsPrompt } from './llm';
import { openai } from '@/lib/integrations/openai/client';
import { AiConfig } from '@/lib/integrations/openai/config';
import { withRetry } from '@/lib/integrations/openai/utils/retry';
import { safeJson } from '@/lib/integrations/openai/utils/json';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

type GenerateOneOnOnePrepParams = TCreateOneOnOneInput & {
  tenantId: string;
  timezone: string;
  db: DB;
};

export function extractUsedReferences(
  talkingPoints: OneOnOneTalkingPoint[],
  context: OneOnOneLLMContext
) {
  const usedMetricIds = new Set<string>();
  const usedInsightIds = new Set<string>();
  const usedPrIds = new Set<string>();
  const usedReviewIds = new Set<string>();

  for (const tp of talkingPoints) {
    tp.relatedMetricIds.forEach((id) => usedMetricIds.add(id));
    tp.relatedInsightIds.forEach((id) => usedInsightIds.add(id));
    tp.relatedPrIds.forEach((id) => usedPrIds.add(id));
    tp.relatedReviewIds.forEach((id) => usedReviewIds.add(id));
  }

  const usedMetrics = context.metrics.filter((m) =>
    usedMetricIds.has(m.metricId)
  );

  const usedInsights = context.insights.filter((i) => usedInsightIds.has(i.id));

  const usedPrs = context.highlightPrs.filter((pr) => usedPrIds.has(pr.id));

  const usedReviews = context.highlightedReviews.filter((review) =>
    usedReviewIds.has(review.id)
  );

  return {
    usedMetrics,
    usedInsights,
    usedPrs,
    usedReviews,
  };
}

async function generateLLMTalkingPoints(
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
                        'feedback_for_manager',
                        'goals',
                        'metrics',
                        'insights',
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
                  required: ['id', 'kind', 'title', 'order'],
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

export async function generateOneOnOnePrep(
  params: GenerateOneOnOnePrepParams
): Promise<NewOneOnOneSession> {
  const {
    tenantId,
    timezone,
    title,
    meetingAt: rawMeetingAt,
    windowWeeks,
    shortWindowStart,
    counterpartLabel,
    counterpartType,
    db,
  } = params;

  const meetingAt = rawMeetingAt ? new Date(rawMeetingAt) : new Date();

  let shortStart = null;
  let shortEnd = meetingAt;
  if (shortWindowStart) {
    shortStart = new Date(shortWindowStart);
  } else {
    shortStart = weeksAgo(shortEnd, windowWeeks ?? 2);
  }

  const shortDurationMs = shortEnd.getTime() - shortStart.getTime();
  const shortWindowWeeks = Math.max(
    1,
    Math.round(shortDurationMs / MS_PER_WEEK)
  );
  const mediumWindowWeeks = Math.max(4, shortWindowWeeks);
  const mediumEnd = meetingAt;
  const mediumStart = weeksAgo(mediumEnd, mediumWindowWeeks);

  const [insights, metrics, activity] = await Promise.all([
    fetchInsightsForWindow({
      tenantId,
      start: mediumStart,
      end: mediumEnd,
      timezone,
    }),
    fetchMetricsForWindows({
      tenantId,
      windows: [
        { key: 'short', start: shortStart, end: shortEnd },
        { key: 'medium', start: mediumStart, end: mediumEnd },
      ],
    }),
    getActivityForOneOnOneRange({
      tenantId,
      start: mediumStart,
      end: mediumEnd,
      timezone,
    }),
  ]);

  const llmContext: OneOnOneLLMContext = {
    meeting: {
      meetingAtISO: meetingAt.toISOString(),
      shortWindowStartISO: shortStart.toISOString(),
      shortWindowEndISO: shortEnd.toISOString(),
      mediumWindowStartISO: mediumStart.toISOString(),
      mediumWindowEndISO: mediumEnd.toISOString(),
      counterpartType: counterpartType ?? 'manager',
      counterpartLabel,
    },
    metrics,
    insights,
    highlightPrs: activity.highlightPrs,
    highlightedReviews: activity.highlightedReviews,
    tags: activity.tags,
  };

  const llmOutput = await generateLLMTalkingPoints(llmContext);

  const talkingPoints = llmOutput.talkingPoints ?? [];
  const references = extractUsedReferences(talkingPoints, llmContext);

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const finalTitle = title ?? `1:1 prep – ${formatter.format(meetingAt)}`;

  const prep: NewOneOnOneSession = {
    tenantId,
    meetingAt,
    shortWindowStart: shortStart,
    shortWindowEnd: shortEnd,
    shortWindowWeeks: windowWeeks,
    mediumWindowStart: mediumStart,
    mediumWindowEnd: mediumEnd,
    title: finalTitle,
    payload: {
      summary: '',
      talkingPoints,
      ...references,
    },

    status: 'ready',
    counterpartLabel,
    counterpartType,
  };

  return prep;
}
