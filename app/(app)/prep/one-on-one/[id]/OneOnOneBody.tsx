'use client';

import { Lightbulb, BarChart3 } from 'lucide-react';
import {
  OneOnOnePrep,
  OneOnOneTalkingPoint,
  TOneOnOneSectionKind,
  OneOnOneMetricSnapshot,
} from '@/types/api/one-on-one';
import { Insight } from '@/types/api/insights';

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
}: {
  prep: OneOnOnePrep;
  onClickInsight: (insight: Insight) => void;
}) {
  const { talkingPoints, usedInsights, usedMetrics } = prep;

  const sectionsWithItems = SECTION_ORDER.map((section) => {
    const items = talkingPoints
      .filter((tp) => tp.kind === section.kind)
      .sort((a, b) => a.order - b.order);

    return {
      ...section,
      items,
    };
  });

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
          usedMetrics={usedMetrics}
          onClickInsight={onClickInsight}
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
  usedMetrics: OneOnOneMetricSnapshot[];
  onClickInsight: (insight: Insight) => void;
};

function OneOnOneSection({
  label,
  items,
  usedInsights,
  usedMetrics,
  onClickInsight,
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
            usedMetrics={usedMetrics}
            isFirst={idx === 0}
            onClickInsight={onClickInsight}
          />
        ))}
      </ul>
    </div>
  );
}

type TalkingPointProps = {
  tp: OneOnOneTalkingPoint;
  usedInsights: Insight[];
  usedMetrics: OneOnOneMetricSnapshot[];
  isFirst: boolean;
  onClickInsight: (insight: Insight) => void;
};

function TalkingPointRow({
  tp,
  usedInsights,
  usedMetrics,
  onClickInsight,
}: TalkingPointProps) {
  const relatedInsights = usedInsights.filter((ins) =>
    tp.relatedInsightIds.includes(ins.id)
  );
  const relatedMetrics = usedMetrics.filter((m) =>
    tp.relatedMetricIds.includes(m.id)
  );

  return (
    <li className="flex flex-col py-1.5">
      {/* Bullet */}
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
      {(relatedInsights.length > 0 || relatedMetrics.length > 0) && (
        <div className="mt-1.5 ml-2 flex flex-wrap gap-1.5">
          {relatedMetrics.map((metric) => (
            <MetricPill key={metric.id} metric={metric} />
          ))}
          {relatedInsights.map((insight) => (
            <InsightPill
              key={insight.id}
              insight={insight}
              onClick={onClickInsight}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function MetricPill({ metric }: { metric: OneOnOneMetricSnapshot }) {
  const label = metric.label;
  const value =
    metric.formattedValue ??
    (metric.value != null
      ? `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`
      : 'n/a');

  return (
    <button
      type="button"
      onClick={() => {}}
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
