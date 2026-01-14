import { PullRequest, Review } from '@/lib/db/schema';
import { Insight } from '@/types/api/insights';
import { TMetricResult } from '@/types/api/metrics';
import {
  PrepMetricSnapshot,
  PrepTalkingPoint,
  UpcomingCalendarEvent,
} from '@/types/api/prep';
import { ActivityEvent } from '@/types/api/timeline';
import { formatMetricValue } from '../../metrics/client';
import {
  serializeActivityEventFromPr,
  serializeActivityEventFromReview,
} from '../../timeline/api/serializers';

export function extractUsedReferences(
  talkingPoints: PrepTalkingPoint[],
  context: {
    prs: PullRequest[];
    reviews: {
      review: Review;
      pr?: PullRequest | null;
    }[];
    calendarEvents: UpcomingCalendarEvent[];
    metrics: TMetricResult[];
    insights: Insight[];
    primaryWindowStartISO: string;
    primaryWindowEndISO: string;
  }
): {
  usedMetrics: PrepMetricSnapshot[];
  usedInsights: Insight[];
  usedPrs: ActivityEvent[];
  usedReviews: ActivityEvent[];
  usedCalendarEvents: UpcomingCalendarEvent[];
} {
  const usedMetricIds = new Set<string>();
  const usedInsightIds = new Set<string>();
  const usedPrIds = new Set<string>();
  const usedReviewIds = new Set<string>();
  const usedCalendarEventIds = new Set<string>();

  for (const tp of talkingPoints) {
    (tp.relatedMetricIds ?? []).forEach((id) => usedMetricIds.add(id));
    (tp.relatedInsightIds ?? []).forEach((id) => usedInsightIds.add(id));
    tp.relatedPrIds.forEach((id) => usedPrIds.add(id));
    tp.relatedReviewIds.forEach((id) => usedReviewIds.add(id));
    tp.relatedCalendarEventIds.forEach((id) => usedCalendarEventIds.add(id));
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
          m.window.start === context.primaryWindowStartISO &&
          m.window.end === context.primaryWindowEndISO
            ? 'short'
            : 'medium',
        label: m.title,
        value,
        formattedValue,
      } as PrepMetricSnapshot;
    });

  const usedInsights = context.insights.filter((i) => usedInsightIds.has(i.id));

  const usedPrs = context.prs
    .filter((pr) => usedPrIds.has(pr.id))
    .map((pr) => serializeActivityEventFromPr(pr));

  const usedReviews = context.reviews
    .filter((r) => usedReviewIds.has(r.review.id))
    .map((r) => serializeActivityEventFromReview(r.review, r.pr?.title));

  const usedCalendarEvents = context.calendarEvents.filter((e) =>
    usedCalendarEventIds.has(e.id)
  );

  return {
    usedMetrics,
    usedInsights,
    usedPrs,
    usedReviews,
    usedCalendarEvents,
  };
}
