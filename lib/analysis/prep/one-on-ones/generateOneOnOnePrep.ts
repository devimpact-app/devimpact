import { db } from '@/lib/db/client';
import { NewOneOnOneSession, oneOnOneSessions } from '@/lib/db/schema/prep';
import { weeksAgo } from '@/lib/utils/date';
import {
  OneOnOneMetricSnapshot,
  OneOnOneTalkingPoint,
  TCreateOneOnOneInput,
} from '@/types/api/one-on-one';
import { OneOnOneLLMContext } from './types';
import { fetchMetricsForWindows } from './metrics';
import { fetchInsightsForWindow } from './insights';
import { getActivityForOneOnOneRange } from './activity';
import { PullRequest, Review } from '@/lib/db/schema';
import { TMetricResult } from '@/types/api/metrics';
import { Insight } from '@/types/api/insights';
import { ActivityEvent } from '@/types/api/timeline';
import {
  getActivityEventForPr,
  getActivityEventForReview,
} from '../../activity/helpers';
import { generateLLMTalkingPoints } from '@/lib/integrations/openai/services/summarizeOneOnOne';
import { formatMetricValue } from '../../metrics/client';
import { buildWorkRhythm } from '../../work-rhythm/buildWorkRhythm';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

type GenerateOneOnOnePrepParams = TCreateOneOnOneInput & {
  tenantId: string;
  timezone: string;
  updateDb?: boolean;
};

export function extractUsedReferences(
  talkingPoints: OneOnOneTalkingPoint[],
  context: {
    prs: PullRequest[];
    reviews: {
      review: Review;
      pr?: PullRequest | null;
    }[];
    metrics: TMetricResult[];
    insights: Insight[];
    shortWindowStartISO: string;
    shortWindowEndISO: string;
    mediumWindowStartISO: string;
    mediumWindowEndISO: string;
  }
): {
  usedMetrics: OneOnOneMetricSnapshot[];
  usedInsights: Insight[];
  usedPrs: ActivityEvent[];
  usedReviews: ActivityEvent[];
} {
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

  const usedMetrics = context.metrics
    .filter((m) => usedMetricIds.has(m.metricId))
    .map((m) => {
      let value: number | null = null;
      let formattedValue: string | undefined = undefined;
      if (m.shape === 'stat') {
        const current = m.data.find((d) => d.kind === 'current');
        value = current?.value ?? null;
        if (value) {
          formattedValue = formatMetricValue(m.valueFormat, value);
        }
      }
      return {
        id: m.metricId,
        unit: m.unit,
        windowStart: m.window.start,
        windowEnd: m.window.end,
        windowKind:
          m.window.start === context.shortWindowStartISO &&
          m.window.end === context.shortWindowEndISO
            ? 'short'
            : 'medium',
        label: m.title,
        value,
        formattedValue,
      } as OneOnOneMetricSnapshot;
    });

  const usedInsights = context.insights.filter((i) => usedInsightIds.has(i.id));

  const usedPrs = context.prs
    .filter((pr) => usedPrIds.has(pr.id))
    .map((pr) => getActivityEventForPr(pr));

  const usedReviews = context.reviews
    .filter((r) => usedReviewIds.has(r.review.id))
    .map((r) => getActivityEventForReview(r.review, r.pr?.title));

  return {
    usedMetrics,
    usedInsights,
    usedPrs,
    usedReviews,
  };
}

export function getDatesForOneOnOne({
  shortWindowStart,
  rawMeetingAt,
  windowWeeks,
}: {
  shortWindowStart?: string;
  rawMeetingAt?: string;
  windowWeeks: TCreateOneOnOneInput['windowWeeks'];
}): {
  meetingAt: Date;
  shortWindowStart: Date;
  shortWindowEnd: Date;
  shortWindowWeeks: number;
  mediumWindowStart: Date;
  mediumWindowEnd: Date;
} {
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

  return {
    shortWindowWeeks,
    shortWindowStart: shortStart,
    shortWindowEnd: shortEnd,
    mediumWindowStart: mediumStart,
    mediumWindowEnd: mediumEnd,
    meetingAt,
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
    updateDb = false,
  } = params;

  const {
    shortWindowWeeks,
    shortWindowStart: shortStart,
    shortWindowEnd: shortEnd,
    mediumWindowStart: mediumStart,
    mediumWindowEnd: mediumEnd,
    meetingAt,
  } = getDatesForOneOnOne({
    shortWindowStart,
    rawMeetingAt,
    windowWeeks,
  });

  const [insights, metrics, activity, workRhythm] = await Promise.all([
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
      start: shortStart,
      end: shortEnd,
      timezone,
    }),
    buildWorkRhythm({
      userId: tenantId,
      timezone,
      startOverride: mediumStart,
      endOverride: mediumEnd,
    }),
  ]);

  const {
    avgDeepWorkBlocksPerWeek: _avgDeepWorkBlocksPerWeek,
    ...workSummary
  } = workRhythm.summary;

  const shortWindowStartISO = shortStart.toISOString();
  const shortWindowEndISO = shortEnd.toISOString();
  const mediumWindowStartISO = mediumStart.toISOString();
  const mediumWindowEndISO = mediumEnd.toISOString();
  const llmContext: OneOnOneLLMContext = {
    meeting: {
      meetingAtISO: meetingAt.toISOString(),
      shortWindowStartISO,
      shortWindowEndISO,
      mediumWindowStartISO,
      mediumWindowEndISO,
      counterpartType: counterpartType ?? 'manager',
      counterpartLabel,
    },
    metrics: metrics.llm,
    insights: insights.llm,
    highlightPrs: activity.llm.highlightPrs,
    highlightedReviews: activity.llm.highlightedReviews,
    tags: activity.llm.tags,
    workRhythm: workSummary,
  };

  const llmOutput = await generateLLMTalkingPoints(llmContext);
  const talkingPoints = llmOutput.talkingPoints ?? [];
  const references = extractUsedReferences(talkingPoints, {
    prs: activity.full.fullPrs,
    reviews: activity.full.fullReviews,
    insights: insights.full,
    metrics: metrics.full,
    shortWindowStartISO,
    shortWindowEndISO,
    mediumWindowStartISO,
    mediumWindowEndISO,
  });

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
  const finalTitle = title ?? `1:1 prep – ${formatter.format(meetingAt)}`;

  const prep: NewOneOnOneSession = {
    tenantId,
    meetingAt,
    shortWindowStart: shortStart,
    shortWindowEnd: shortEnd,
    shortWindowWeeks,
    mediumWindowStart: mediumStart,
    mediumWindowEnd: mediumEnd,
    title: finalTitle,
    payload: {
      talkingPoints,
      ...references,
    },

    status: 'ready',
    counterpartLabel,
    counterpartType,
  };

  if (updateDb) {
    await db
      .insert(oneOnOneSessions)
      .values(prep)
      .onConflictDoUpdate({
        target: [
          oneOnOneSessions.tenantId,
          oneOnOneSessions.meetingAt,
          oneOnOneSessions.counterpartType,
        ],
        set: {
          title: prep.title,
          shortWindowStart: prep.shortWindowStart,
          shortWindowEnd: prep.shortWindowEnd,
          mediumWindowStart: prep.mediumWindowStart,
          mediumWindowEnd: prep.mediumWindowEnd,
          payload: prep.payload,
          status: prep.status,
          counterpartLabel: prep.counterpartLabel,
          counterpartType: prep.counterpartType,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  return prep;
}
