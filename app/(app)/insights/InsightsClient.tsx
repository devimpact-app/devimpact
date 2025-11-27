'use client';

import { RangePicker } from '@/components/dates/RangePicker';
import { useRange } from '@/components/dates/useRangeNavigation';
import { InsightsSection } from '@/components/insights/InsightsSection';
import { useInsights } from '@/components/insights/useInsights';
import { KeyMetricsPanel } from './KeyMetricsView';

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function InsightsClient({ user }: Props) {
  const { range, setRange, label, subLabel, numWeeks, start, end } = useRange();

  const { insights, error, isLoading } = useInsights({
    limit: 50,
    windowWeeks: numWeeks,
  });

  const highlightedInsights = insights.slice(0, 3);
  const libraryInsights = insights.slice(3);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
              Insights about your work
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Patterns, bottlenecks and leverage in how you&apos;ve been working
              over{' '}
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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        {/* Left column: highlighted + library */}
        <div className="space-y-8">
          <InsightsSection
            insights={highlightedInsights}
            isLoading={isLoading}
            error={error}
            title="High-signal insights"
            subtitle="The strongest patterns from this period"
          />

          <InsightsSection
            insights={libraryInsights}
            isLoading={isLoading}
            error={error}
            title="All insights this period"
            subtitle="Every story we surfaced in this window"
          />
        </div>

        {/* Right column: sticky trends summary (desktop only for now) */}
        <aside className="hidden lg:block lg:sticky lg:top-20">
          <KeyMetricsPanel
            range={{
              start,
              end,
            }}
          />
        </aside>
      </section>
    </main>
  );
}
