'use client';

import { Lightbulb, BarChart3, GitPullRequest, GitCompare } from 'lucide-react';
import {
  OneOnOnePrep,
  OneOnOneTalkingPoint,
  TOneOnOneSectionKind,
  OneOnOneMetricSnapshot,
} from '@/types/api/one-on-one';
import { Insight } from '@/types/api/insights';
import { useMemo } from 'react';
import { ActivityEvent } from '@/types/api/timeline';

const SECTION_ORDER: { kind: TOneOnOneSectionKind; label: string }[] = [
  { kind: 'highlights', label: 'Highlights' },
  { kind: 'friction', label: 'Friction & blockers' },
  { kind: 'asks', label: 'Asks' },
  { kind: 'feedback_for_manager', label: 'Feedback for your manager' },
  { kind: 'goals', label: 'Goals & next steps' },
  // we’ll handle 'metrics' and 'insights' kinds later if we need them
];

export function OneOnOneBody({
  prep,
  onClickInsight,
  onClickMetric,
  onClickActivity,
}: {
  prep: OneOnOnePrep;
  onClickInsight: (insight: Insight) => void;
  onClickMetric: (metric: OneOnOneMetricSnapshot) => void;
  onClickActivity: (activity: ActivityEvent) => void;
}) {
  const { talkingPoints, usedInsights, usedMetrics, usedPrs, usedReviews } =
    prep;

  const sectionsWithItems = SECTION_ORDER.map((section) => {
    const items = talkingPoints
      .filter((tp) => tp.kind === section.kind)
      .sort((a, b) => a.order - b.order);

    return {
      ...section,
      items,
    };
  });

  const metricsByMetricId = useMemo(() => {
    const map = new Map<string, OneOnOneMetricSnapshot[]>();
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
        <OneOnOneSection
          key={section.kind}
          label={section.label}
          items={section.items}
          usedInsights={usedInsights}
          usedPrs={usedPrs}
          usedReviews={usedReviews}
          onClickInsight={onClickInsight}
          onClickMetric={onClickMetric}
          onClickActivity={onClickActivity}
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
  items: OneOnOneTalkingPoint[];
  usedInsights: Insight[];
  usedPrs: ActivityEvent[];
  usedReviews: ActivityEvent[];
  onClickInsight: (insight: Insight) => void;
  onClickMetric: (metric: OneOnOneMetricSnapshot) => void;
  onClickActivity: (activity: ActivityEvent) => void;
  metricsByMetricId: Map<string, OneOnOneMetricSnapshot[]>;
};

function OneOnOneSection({
  label,
  items,
  usedInsights,
  usedPrs,
  usedReviews,
  onClickInsight,
  onClickMetric,
  onClickActivity,
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
            isFirst={idx === 0}
            onClickInsight={onClickInsight}
            onClickMetric={onClickMetric}
            onClickActivity={onClickActivity}
            metricsByMetricId={metricsByMetricId}
          />
        ))}
      </ul>
    </div>
  );
}

type TalkingPointProps = {
  tp: OneOnOneTalkingPoint;
  usedInsights: Insight[];
  usedPrs: ActivityEvent[];
  usedReviews: ActivityEvent[];
  isFirst: boolean;
  onClickInsight: (insight: Insight) => void;
  onClickMetric: (metric: OneOnOneMetricSnapshot) => void;
  onClickActivity: (activity: ActivityEvent) => void;
  metricsByMetricId: Map<string, OneOnOneMetricSnapshot[]>;
};

function TalkingPointRow({
  tp,
  usedInsights,
  usedPrs,
  usedReviews,
  onClickInsight,
  onClickMetric,
  onClickActivity,
  metricsByMetricId,
}: TalkingPointProps) {
  const relatedInsights = usedInsights.filter((ins) =>
    tp.relatedInsightIds.includes(ins.id)
  );
  const relatedMetricIds = tp.relatedMetricIds;
  const relatedPrIds = tp.relatedPrIds.map((prId) => `pr_merged:${prId}`);
  const relatedPrs = usedPrs.filter((pr) => relatedPrIds.includes(pr.id));
  const relatedReviewIds = tp.relatedReviewIds.map(
    (rId) => `review_submitted:${rId}`
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
      {(relatedInsights.length > 0 || relatedMetricIds.length > 0) && (
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
        </div>
      )}
    </li>
  );
}

function MetricPill({
  metrics,
  onClick,
}: {
  metrics: OneOnOneMetricSnapshot[];
  onClick: (metric: OneOnOneMetricSnapshot) => void;
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
