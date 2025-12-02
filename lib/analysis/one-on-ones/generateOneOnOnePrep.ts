import { DB } from '@/lib/db/client';
import { NewOneOnOneSession } from '@/lib/db/schema/prep';
import { weeksAgo } from '@/lib/utils/date';
import { Insight } from '@/types/api/insights';
import {
  OneOnOneTalkingPoint,
  TCreateOneOnOneInput,
} from '@/types/api/one-on-one';
import { runBatchServer } from '../metrics/runBatchServer';
import { TMetricsBatchInput } from '@/types/api/metrics';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

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
  windows: { key: 'short' | 'medium'; start: Date; end: Date }[];
  db: DB;
}): Promise<Record<string, Record<string, number | null>>> {
  const { tenantId, windows } = params;

  const shortWindow = windows.find((w) => w.key === 'short');
  const mediumWindow = windows.find((w) => w.key === 'medium');
  if (!shortWindow || !mediumWindow)
    return {
      short: {},
      medium: {},
    };
  const { start: shortWindowStart, end: shortWindowEnd } = shortWindow ?? {};
  const { start: mediumWindowStart, end: mediumWindowEnd } = mediumWindow ?? {};

  const metricIds = [
    'pr.authored_merged_count.v1',
    'pr.lead_time_seconds.v1',
    'pr.time_to_first_review.v1',
    'pr.time_review_to_merge.v1',
    'pr.size_lines_changed_median.v1',
    'pr.size_files_changed_median.v1',
    'pr.test_rate.v1',
    'pr.blocked_rate.v1',
    'review.given_count.v1',
    'review.latency_seconds.avg.v1',
    'review.comment_count.avg.v1',
  ];

  const batchResult = await runBatchServer(
    {
      requests: metricIds.flatMap((metricId) => [
        {
          metricId,
          input: {
            start: shortWindowStart.toISOString(),
            end: shortWindowEnd.toISOString(),
            windowWeeks: 0,
            shape: 'stat',
            comparison: { kind: 'previous_period' },
          },
        },
        {
          metricId,
          input: {
            start: mediumWindowStart.toISOString(),
            end: mediumWindowEnd.toISOString(),
            windowWeeks: 0,
            shape: 'timeseries',
          },
        },
      ]),
    } as TMetricsBatchInput,
    tenantId
  );

  return {
    short: {},
    medium: {},
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
      // summary: `1:1 prep for ${rowP} covering ${mediumStart}–${mediumEnd}. Focus on delivery, code health, and current blockers.`,
      summary: '',
      talkingPoints: [
        {
          id: 'tp-1',
          kind: 'highlights',
          title: 'Auth refactor PR',
          body: 'Closed out the lingering auth cleanup PR (#4821) that had been stalled for two weeks. Reduced ~600 lines of dead code.',
          order: 1,
          relatedInsightIds: ['shipping_momentum:last_4_weeks'],
          relatedMetricIds: ['pr.authored_merged_count.v1'],
        },
        {
          id: 'tp-2',
          kind: 'highlights',
          title: 'Billing settings UI',
          body: 'Delivered the initial settings panel. Minimal scope but unblocked design and helped backend validate API shape.',
          order: 2,
          relatedInsightIds: [],
          relatedMetricIds: ['pr.authored_merged_count.v1'],
        },
        {
          id: 'tp-3',
          kind: 'friction',
          title: 'Slow review turnaround',
          body: 'The two PRs for notifications batching sat 4–5 days waiting for review, causing some context switching.',
          order: 3,
          relatedInsightIds: ['shipping_momentum:last_4_weeks'],
          relatedMetricIds: ['pr.authored_merged_count.v1'],
        },
        {
          id: 'tp-4',
          kind: 'friction',
          title: 'Recurring setup issues',
          body: 'Spent multiple hours reinstalling local dependencies after the Node 20 upgrade. Seems to affect others too.',
          order: 4,
          relatedInsightIds: [],
          relatedMetricIds: [],
        },
        {
          id: 'tp-5',
          kind: 'goals',
          title: 'Time spent on small reactive fixes',
          body: 'Last sprint had 12+ minor fixes that broke flow. Would be helpful to batch or defer some of that work.',
          order: 5,
          relatedInsightIds: ['shipping_momentum:last_4_weeks'],
          relatedMetricIds: [],
        },
        {
          id: 'tp-6',
          kind: 'goals',
          title: 'Clarity in initial PR descriptions',
          body: 'A couple of reviewers mentioned needing more context. Small tweaks could help reduce review cycles.',
          order: 6,
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
        },
      ],

      usedMetrics: [
        {
          id: 'pr.authored_merged_count.v1',
          label: 'PRs merged',
          unit: 'PRs',
          windowStart: mediumStart.toISOString(),
          windowEnd: mediumEnd.toISOString(),
          windowKind: 'medium',
          value: 24,
          formattedValue: '24 PRs merged',
        },
      ],
    },

    status: 'ready',
    counterpartLabel,
    counterpartType,
  };

  return prep;
}
