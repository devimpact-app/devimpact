'use client';

import {
  Lightbulb,
  BarChart3,
  GitPullRequest,
  GitCompare,
  Calendar,
} from 'lucide-react';
import { Insight } from '@/types/api/insights';
import { useMemo } from 'react';
import { ActivityEvent } from '@/types/api/timeline';
import {
  PrepItem,
  PrepMeetingType,
  PrepMetricSnapshot,
  PrepTalkingPoint,
  TPrepSectionKind,
  UpcomingCalendarEvent,
} from '@/types/api/prep';
import { formatDateOnly } from '@/lib/utils/date';

const SECTIONS_BY_TYPE: Record<PrepMeetingType, TPrepSectionKind[]> = {
  oneOnOne: [
    'highlights',
    'friction',
    'asks',
    'collaboration',
    'growth',
    'focus_areas',
    'goals',
  ],
  standup: ['yesterday', 'today', 'blockers'],
  planning: [],
  retro: [],
};

const SECTION_LABEL: Record<TPrepSectionKind, string> = {
  highlights: 'Highlights',
  friction: 'Friction & blockers',
  asks: 'Asks',
  collaboration: 'Collaboration',
  growth: 'Growth',
  focus_areas: 'Focus Areas',
  goals: 'Goals & next steps',
  yesterday: 'Yesterday',
  today: 'Today',
  blockers: 'Blockers',
};

export function PrepBody({
  prep,
  onClickInsight,
  onClickMetric,
  onClickActivity,
  onClickCalendarEvent,
}: {
  prep: PrepItem;
  onClickInsight: (insight: Insight) => void;
  onClickMetric: (metric: PrepMetricSnapshot) => void;
  onClickActivity: (activity: ActivityEvent) => void;
  onClickCalendarEvent: (event: UpcomingCalendarEvent) => void;
}) {
  const {
    talkingPoints,
    usedInsights,
    usedMetrics,
    usedPrs,
    usedReviews,
    usedCalendarEvents,
  } = prep;

  const allSections = SECTIONS_BY_TYPE[prep.meetingType];

  const sectionsWithItems = allSections.map((section) => {
    const items = talkingPoints
      .filter((tp) => tp.kind === section)
      .sort((a, b) => a.order - b.order);

    return {
      kind: section,
      label: SECTION_LABEL[section],
      items,
    };
  });

  const metricsByMetricId = useMemo(() => {
    const map = new Map<string, PrepMetricSnapshot[]>();
    for (const metric of usedMetrics) {
      if (!map.has(metric.id)) {
        map.set(metric.id, []);
      }
      map.get(metric.id)!.push(metric);
    }
    return map;
  }, [usedMetrics]);

  const nonEmptySections = sectionsWithItems.filter((s) => s.items.length > 0);
  const emptySections = sectionsWithItems.filter((s) => s.items.length === 0);

  return (
    <section className="space-y-8">
      {nonEmptySections.map((section) => (
        <PrepSection
          key={section.kind}
          label={section.label}
          items={section.items}
          usedInsights={usedInsights}
          usedPrs={usedPrs}
          usedReviews={usedReviews}
          usedCalendarEvents={usedCalendarEvents}
          onClickInsight={onClickInsight}
          onClickMetric={onClickMetric}
          onClickActivity={onClickActivity}
          onClickCalendarEvent={onClickCalendarEvent}
          metricsByMetricId={metricsByMetricId}
        />
      ))}
      {emptySections.map((section) => (
        <div
          key={section.kind}
          className="rounded-xl border border-white/5 bg-surface-lower px-4 py-3"
        >
          <h2 className="text-sm font-medium text-text-primary">
            {section.label}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            No items for this section yet.
          </p>
        </div>
      ))}
    </section>
  );
}

type SectionProps = {
  label: string;
  items: PrepTalkingPoint[];
  usedInsights: Insight[];
  usedPrs: ActivityEvent[];
  usedReviews: ActivityEvent[];
  usedCalendarEvents: UpcomingCalendarEvent[];
  onClickInsight: (insight: Insight) => void;
  onClickMetric: (metric: PrepMetricSnapshot) => void;
  onClickActivity: (activity: ActivityEvent) => void;
  onClickCalendarEvent: (event: UpcomingCalendarEvent) => void;
  metricsByMetricId: Map<string, PrepMetricSnapshot[]>;
};

function PrepSection({
  label,
  items,
  usedInsights,
  usedPrs,
  usedReviews,
  usedCalendarEvents,
  onClickInsight,
  onClickMetric,
  onClickActivity,
  onClickCalendarEvent,
  metricsByMetricId,
}: SectionProps) {
  return (
    <div className="pl-3 border-l border-indigo-400/60 space-y-4">
      <h2 className="text-sm pl-1 font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </h2>

      <ul className="mt-2 pl-1.5">
        {items.map((tp, idx) => (
          <TalkingPointRow
            key={tp.id}
            tp={tp}
            usedInsights={usedInsights}
            usedPrs={usedPrs}
            usedReviews={usedReviews}
            usedCalendarEvents={usedCalendarEvents}
            isFirst={idx === 0}
            onClickInsight={onClickInsight}
            onClickMetric={onClickMetric}
            onClickActivity={onClickActivity}
            onClickCalendarEvent={onClickCalendarEvent}
            metricsByMetricId={metricsByMetricId}
          />
        ))}
      </ul>
    </div>
  );
}

type TalkingPointProps = {
  tp: PrepTalkingPoint;
  usedInsights: Insight[];
  usedPrs: ActivityEvent[];
  usedReviews: ActivityEvent[];
  usedCalendarEvents: UpcomingCalendarEvent[];
  isFirst: boolean;
  onClickInsight: (insight: Insight) => void;
  onClickMetric: (metric: PrepMetricSnapshot) => void;
  onClickActivity: (activity: ActivityEvent) => void;
  onClickCalendarEvent: (event: UpcomingCalendarEvent) => void;
  metricsByMetricId: Map<string, PrepMetricSnapshot[]>;
};

function TalkingPointRow({
  tp,
  usedInsights,
  usedPrs,
  usedReviews,
  usedCalendarEvents,
  onClickInsight,
  onClickMetric,
  onClickActivity,
  onClickCalendarEvent,
  metricsByMetricId,
}: TalkingPointProps) {
  const relatedInsights = usedInsights.filter((ins) =>
    tp.relatedInsightIds.includes(ins.id)
  );
  const relatedMetricIds = tp.relatedMetricIds;
  const relatedPrIds = [
    ...tp.relatedPrIds.map((prId) => `pr_merged:${prId}`),
    ...tp.relatedPrIds.map((prId) => `pr_opened:${prId}`),
  ];
  const relatedPrs = usedPrs.filter((pr) => relatedPrIds.includes(pr.id));
  const relatedReviewIds = tp.relatedReviewIds.map(
    (rId) => `review_submitted:${rId}`
  );
  const relatedCalendarEvents = usedCalendarEvents.filter((e) =>
    tp.relatedCalendarEventIds.includes(e.id)
  );
  const relatedReviews = usedReviews.filter((r) =>
    relatedReviewIds.includes(r.id)
  );

  return (
    <li className="flex flex-col py-1.5">
      <div className="flex flex-row items-center">
        <span className="h-1.5 w-1.5 mr-2 flex-shrink-0 rounded-full bg-white/30" />

        <div className="text-sm mr-1 font-medium text-[#E5E9EF]">
          {tp.title}:
        </div>
      </div>
      {tp.body && (
        <p className="ml-3 text-sm text-text-secondary whitespace-pre-wrap">
          {tp.body}
        </p>
      )}
      {(relatedInsights.length > 0 ||
        relatedMetricIds.length > 0 ||
        relatedPrs.length > 0 ||
        relatedReviews.length > 0 ||
        relatedCalendarEvents.length > 0) && (
        <div className="mt-1.5 ml-2 flex flex-wrap gap-1.5">
          {relatedMetricIds.map((metricId) => (
            <MetricPill
              key={metricId}
              metrics={metricsByMetricId.get(metricId) ?? []}
              onClick={onClickMetric}
            />
          ))}
          {relatedInsights.map((insight) => (
            <InsightPill
              key={insight.id}
              insight={insight}
              onClick={onClickInsight}
            />
          ))}
          {relatedPrs.map((pr) => (
            <PRPill key={pr.id} pr={pr} onClick={onClickActivity} />
          ))}
          {relatedReviews.map((r) => (
            <ReviewPill key={r.id} review={r} onClick={onClickActivity} />
          ))}
          {relatedCalendarEvents.map((e) => (
            <CalendarEventPill
              key={e.id}
              event={e}
              onClick={onClickCalendarEvent}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function MetricPill({
  metrics,
  onClick,
}: {
  metrics: PrepMetricSnapshot[];
  onClick: (metric: PrepMetricSnapshot) => void;
}) {
  if (metrics.length === 0) return null;

  const statMetric = metrics.find((m) => !!m.value);
  const timeseriesMetric = metrics.find((m) => !m.value);
  if (!statMetric && !timeseriesMetric) return null;
  const label = statMetric?.label ?? timeseriesMetric?.label;
  const value =
    statMetric?.formattedValue ??
    (statMetric?.value != null
      ? `${statMetric.value}${statMetric.unit ? ` ${statMetric.unit}` : ''}`
      : 'n/a');

  return (
    <button
      type="button"
      onClick={() => onClick((timeseriesMetric ?? statMetric)!)}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-lower px-2 py-1 text-[10px] text-text-secondary hover:bg-white/5 hover:text-text-primary transition"
    >
      <BarChart3 className="h-3 w-3" />
      <span className="truncate max-w-[9rem]">
        {label}: {value}
      </span>
    </button>
  );
}

function InsightPill({
  insight,
  onClick,
}: {
  insight: Insight;
  onClick: (insight: Insight) => void;
}) {
  const label = insight.title;

  return (
    <button
      type="button"
      onClick={() => onClick(insight)}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-lower px-2 py-1 text-[10px] text-text-secondary hover:bg-white/5 hover:text-text-primary transition"
    >
      <Lightbulb className="h-3 w-3" />
      <span className="truncate max-w-[9rem]">{label}</span>
    </button>
  );
}

function PRPill({
  pr,
  onClick,
}: {
  pr: ActivityEvent;
  onClick: (pr: ActivityEvent) => void;
}) {
  const prNumber = pr.meta?.prNumber;
  const prTitle = pr.meta?.prTitle ?? pr.title;

  if (!prNumber) return null;

  return (
    <button
      type="button"
      onClick={() => onClick(pr)}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-lower px-2 py-1 text-[10px] text-text-secondary hover:bg-white/5 hover:text-text-primary transition"
    >
      <GitPullRequest className="h-3 w-3" />
      <span className="truncate max-w-[9rem]">
        #{prNumber}: {prTitle}
      </span>
    </button>
  );
}

function CalendarEventPill({
  event,
  onClick,
}: {
  event: UpcomingCalendarEvent;
  onClick: (pr: UpcomingCalendarEvent) => void;
}) {
  const title = event.title;
  const startAt = event.startAtISO;

  if (!title) return;

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-lower px-2 py-1 text-[10px] text-text-secondary hover:bg-white/5 hover:text-text-primary transition"
    >
      <Calendar className="h-3 w-3" />
      <span className="truncate max-w-[9rem]">
        {title} - {formatDateOnly(startAt)}
      </span>
    </button>
  );
}

function ReviewPill({
  review,
  onClick,
}: {
  review: ActivityEvent;
  onClick: (pr: ActivityEvent) => void;
}) {
  const title = review.title;
  return (
    <button
      type="button"
      onClick={() => onClick(review)}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-lower px-2 py-1 text-[10px] text-text-secondary hover:bg-white/5 hover:text-text-primary transition"
    >
      <GitCompare className="h-3 w-3" />
      <span className="truncate max-w-[9rem]">{title}</span>
    </button>
  );
}
