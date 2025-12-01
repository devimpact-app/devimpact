import { DB } from '@/lib/db/client';
import { NewOneOnOneSession } from '@/lib/db/schema/prep';
import { weeksAgo } from '@/lib/utils/date';
import { Insight } from '@/types/api/insights';
import {
  OneOnOneMetricSnapshot,
  OneOnOneTalkingPoint,
  TCreateOneOnOneInput,
} from '@/types/api/one-on-one';

type GenerateOneOnOnePrepParams = TCreateOneOnOneInput & {
  tenantId: string;
  timezone: string;
  db: DB;
};

type OneOnOneLLMContext = {
  shortWindow: {
    start: string;
    end: string;
    summaryStats: Record<string, number | null>;
    recentInsights: Insight[];
  };
  mediumWindow: {
    start: string;
    end: string;
    summaryStats: Record<string, number | null>;
    topInsights: Insight[];
  };
};

type OneOnOneLLMOutput = {
  talkingPoints: OneOnOneTalkingPoint[];
  usedInsightIds?: string[];
  usedMetricIds?: string[];
};

async function fetchInsightsForWindow(params: {
  tenantId: string;
  start: Date;
  end: Date;
  limit: number;
  db: DB;
}): Promise<Insight[]> {
  const { tenantId, start, end, limit, db } = params;
  // TODO: Call your existing insights engine / query.
  // For v0, you can reuse the same generator behind /api/insights
  // and pass a window override.
  void tenantId;
  void db;
  void start;
  void end;
  void limit;
  return [];
}

async function fetchMetricsForWindows(params: {
  tenantId: string;
  windows: { key: 'short' | 'medium' | 'long'; start: Date; end: Date }[];
  db: DB;
}): Promise<Record<string, Record<string, number | null>>> {
  const { tenantId, windows } = params;
  void tenantId;
  void windows;
  // TODO:
  // - Build a MetricsBatchInput with your chosen metricIds
  //   (e.g. cycle time, review latency, blocked ratio).
  // - Run through your metrics engine.
  // - Return a map like:
  //   {
  //     short: { 'metric.id.1': 12.3, 'metric.id.2': 0.45 },
  //     medium: { ... },
  //     long: { ... },
  //   }
  return {
    short: {},
    medium: {},
    long: {},
  };
}

async function generateLLMTalkingPoints(
  ctx: OneOnOneLLMContext
): Promise<OneOnOneLLMOutput> {
  // TODO: Replace this with your real OpenAI client & prompt.
  // Keep output as strict JSON.

  // const response = await callOpenAIJson<OneOnOneLLMOutput>({
  //   system: prompt,
  //   user: ctx,
  // });
  return {
    talkingPoints: [],
    usedInsightIds: [],
    usedMetricIds: [],
  };
}

export async function generateOneOnOnePrep(
  params: GenerateOneOnOnePrepParams
): Promise<NewOneOnOneSession> {
  const {
    tenantId,
    timezone,
    meetingAt: rawMeetingAt,
    windowWeeks = 2,
    counterpartLabel,
    counterpartType,
    db,
  } = params;

  const meetingAt = rawMeetingAt ? new Date(rawMeetingAt) : new Date();

  const shortEnd = meetingAt;
  const shortStart = weeksAgo(meetingAt, windowWeeks);

  const mediumEnd = meetingAt;
  const mediumStart = weeksAgo(meetingAt, 4);

  // 2) Fetch insights + metrics in parallel
  const [shortInsights, mediumInsights, metricsByWindow] = await Promise.all([
    fetchInsightsForWindow({
      tenantId,
      start: shortStart,
      end: shortEnd,
      limit: 6,
      db,
    }),
    fetchInsightsForWindow({
      tenantId,
      start: mediumStart,
      end: mediumEnd,
      limit: 8,
      db,
    }),
    fetchMetricsForWindows({
      tenantId,
      windows: [
        { key: 'short', start: shortStart, end: shortEnd },
        { key: 'medium', start: mediumStart, end: mediumEnd },
      ],
      db,
    }),
  ]);

  // 3) Assemble LLM context
  const llmContext: OneOnOneLLMContext = {
    shortWindow: {
      start: shortStart.toISOString(),
      end: shortEnd.toISOString(),
      summaryStats: metricsByWindow.short ?? {},
      recentInsights: shortInsights,
    },
    mediumWindow: {
      start: mediumStart.toISOString(),
      end: mediumEnd.toISOString(),
      summaryStats: metricsByWindow.medium ?? {},
      topInsights: mediumInsights,
    },
  };

  // 4) Ask LLM to draft talking points + notes
  const llmOutput = await generateLLMTalkingPoints(llmContext);

  const talkingPoints = llmOutput.talkingPoints ?? [];
  const usedInsightIds = Array.from(
    new Set(
      (llmOutput.usedInsightIds ??
        talkingPoints.flatMap((tp) => tp.relatedInsightIds ?? [])) as string[]
    )
  );
  const usedMetricIds = Array.from(
    new Set(
      (llmOutput.usedMetricIds ??
        talkingPoints.flatMap((tp) => tp.relatedMetricIds ?? [])) as string[]
    )
  );

  // 5) Build a human-ish title – you can refine later
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const title = `1:1 prep – ${formatter.format(meetingAt)}`;

  const prep: NewOneOnOneSession = {
    tenantId,
    meetingAt,
    shortWindowStart: shortStart,
    shortWindowEnd: shortEnd,
    mediumWindowStart: mediumStart,
    mediumWindowEnd: mediumEnd,
    title,
    payload: {
      summary: `1:1 prep for ${counterpartLabel} covering ${mediumStart}–${mediumEnd}. Focus on delivery, code health, and current blockers.`,

      talkingPoints: [
        {
          id: 'tp-1',
          kind: 'highlights', // adjust to your real enum
          title: 'Recent wins',
          body: 'They’ve had steady output and fewer stalled PRs over the last month.',
          order: 1,
          relatedInsightIds: ['shipping_momentum:last_4_weeks'],
          relatedMetricIds: ['prs_merged:last_4_weeks'],
        },
        {
          id: 'tp-2',
          kind: 'goals',
          title: 'Growth opportunities',
          body: 'Could delegate more and reduce time spent on minor fixes. Might benefit from clearer PR descriptions.',
          order: 2,
          relatedInsightIds: [],
          relatedMetricIds: [],
        },
        {
          id: 'tp-3',
          kind: 'friction',
          title: 'Potential blockers',
          body: 'Flag possible over-commitment during sprint planning; watch for context switching between projects.',
          order: 3,
          relatedInsightIds: [],
          relatedMetricIds: ['prs_merged:last_4_weeks'],
        },
      ],

      usedInsights: [
        {
          id: 'shipping_momentum:last_4_weeks',
          kind: 'fast_loops',
          title: 'Shipping momentum is trending up over the last 4 weeks',
          body: 'They merged more PRs than their recent baseline with fewer reverts, which signals improving consistency.',
          emphasis: 'Upward trend in shipped work',
          stats: [],
          severity: 'positive',
          score: 70,
          timeWindowLabel: 'Last 4 weeks',
          meta: { source: 'stub' },
          relatedItems: [],
        } as Insight,
      ],

      usedMetrics: [
        {
          id: 'prs_merged:last_4_weeks',
          label: 'PRs merged',
          unit: 'PRs',
          windowStart: mediumStart.toISOString(),
          windowEnd: mediumEnd.toISOString(),
          value: 24,
          formattedValue: '24 PRs merged',
        } as OneOnOneMetricSnapshot,
      ],
    },

    status: 'draft',
    counterpartLabel,
    counterpartType,
  };

  return prep;
}
