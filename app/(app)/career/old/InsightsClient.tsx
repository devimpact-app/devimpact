'use client';

import { RangePicker } from '@/components/dates/RangePicker';
import { useRange } from '@/components/dates/useRangeNavigation';
import { InsightsSection } from '@/components/insights/InsightsSection';
import { useInsights } from '@/components/insights/useInsights';
import { KeyMetricsPanel } from './KeyMetricsView';
import { useState } from 'react';
import { Insight } from '@/types/api/insights';
import { InsightPanel } from '../../../../components/insights/InsightPanel';
import { TTimeseriesResult } from '@/types/api/metrics';
import { OneOnOneMetricSnapshot } from '@/types/api/one-on-one';
import { MetricPanel } from '@/components/metrics/MetricPanel';
import { useRouter } from 'next/navigation';

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function InsightsClient({ user }: Props) {
  const router = useRouter();
  const { range, setRange, label, subLabel, numWeeks, start, end } = useRange();
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [selectedMetric, setSelectedMetric] =
    useState<OneOnOneMetricSnapshot | null>(null);
  const { insights, error, isLoading } = useInsights({
    limit: 50,
    windowWeeks: numWeeks,
  });

  const highlightedInsights = insights.slice(0, 3);
  const libraryInsights = insights.slice(3);

  const handleClickMetric = (result: TTimeseriesResult) => {
    setSelectedMetric({
      id: result.metricId,
      label: result.title!,
      windowStart: result.window.start,
      windowEnd: result.window.end,
      windowKind: 'medium',
      value: null,
    });
  };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
                Insights about your work
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Patterns, bottlenecks and leverage in how you&apos;ve been
                working over{' '}
                <span className="text-text-primary/80">
                  {label.toLowerCase()}
                </span>{' '}
                <span className="text-text-secondary/80">({subLabel})</span>.
              </p>
            </div>

            <div className="flex shrink-0 justify-end">
              <RangePicker value={range} onChange={setRange} />
            </div>
          </div>
        </header>

        <section className="grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6 h-[calc(100vh-132px)]">
          <div className="overflow-y-auto no-scrollbar pr-2 space-y-8 pb-10">
            <InsightsSection
              insights={highlightedInsights}
              isLoading={isLoading}
              error={error}
              title="Highlighted insights"
              subtitle="The strongest patterns from this period"
              onInsightClick={(insight) => {
                setSelectedInsight(insight);
              }}
            />

            <InsightsSection
              insights={libraryInsights}
              isLoading={isLoading}
              error={error}
              title="Other insights this period"
              subtitle="Other stories we surfaced in this window"
              isHighlight={false}
              onInsightClick={(insight) => {
                setSelectedInsight(insight);
              }}
            />
          </div>

          <aside className="hidden lg:block pl-2">
            <KeyMetricsPanel
              start={start}
              windowWeeks={numWeeks}
              onClickMetric={handleClickMetric}
              onViewAll={() => {
                router.push('/insights/metrics');
              }}
            />
          </aside>
        </section>
      </main>
      {selectedInsight && (
        <InsightPanel
          key={selectedInsight.id}
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
      {selectedMetric && (
        <MetricPanel
          key={selectedMetric.id}
          metric={selectedMetric}
          onClose={() => setSelectedMetric(null)}
        />
      )}
    </>
  );
}
