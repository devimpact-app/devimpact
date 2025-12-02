import { DB } from '@/lib/db/client';
import { NewOneOnOneSession } from '@/lib/db/schema/prep';
import { weeksAgo } from '@/lib/utils/date';
import { TCreateOneOnOneInput } from '@/types/api/one-on-one';
import { OneOnOneLLMContext, OneOnOneLLMOutput } from './types';
import { fetchMetricsForWindows } from './metrics';
import { fetchInsightsForWindow } from './insights';
import { getActivityForOneOnOneRange } from './activity';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

type GenerateOneOnOnePrepParams = TCreateOneOnOneInput & {
  tenantId: string;
  timezone: string;
  db: DB;
};

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

  // const talkingPoints = llmOutput.talkingPoints ?? [];

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
