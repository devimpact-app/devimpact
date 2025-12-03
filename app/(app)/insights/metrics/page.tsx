'use client';

import { RangePicker } from '@/components/dates/RangePicker';
import { useRange } from '@/components/dates/useRangeNavigation';
import { MetricsAPI } from '@/lib/analysis/metrics/client';
import { TMetricsBatchInput, TMetricsBatchResult } from '@/types/api/metrics';
import { useEffect, useState } from 'react';
import { MetricTimeseriesChart } from '../MetricTimeseriesChart';

type AllMetricsState = {
  data: TMetricsBatchResult | null;
  isLoading: boolean;
  error: string | null;
};

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

function useKeyMetrics({
  start,
  windowWeeks,
}: {
  start: Date;
  windowWeeks: number;
}): AllMetricsState {
  const [state, setState] = useState<AllMetricsState>({
    data: null,
    isLoading: true,
    error: null,
  });

  // Keep a stable ISO window for the API
  const startIso = start?.toISOString();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const batchInput: TMetricsBatchInput = {
          requests: metricIds.map((id) => ({
            metricId: id,
            input: {
              shape: 'timeseries',
              start: startIso,
              windowWeeks,
            },
          })),
        };

        const batchResult = await MetricsAPI.runBatch(batchInput);

        if (!cancelled) {
          setState({
            data: batchResult,
            isLoading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err?.message ?? 'Failed to load metrics',
          }));
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [startIso, windowWeeks]);

  return state;
}

export default function MetricsPage() {
  const { range, setRange, label, subLabel, numWeeks, start, end } = useRange();

  const { data, isLoading, error } = useKeyMetrics({
    start,
    windowWeeks: numWeeks,
  });

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 space-y-8 pb-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
              Your engineering metrics
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Trends and activity across{' '}
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

      {isLoading && (
        <div className="space-y-2">
          <div className="h-10 rounded-xl bg-slate-900/70 animate-pulse" />
          <div className="h-10 rounded-xl bg-slate-900/70 animate-pulse" />
          <div className="h-10 rounded-xl bg-slate-900/70 animate-pulse" />
        </div>
      )}

      {error && !isLoading && (
        <p className="text-[11px] text-red-400">
          Couldn&apos;t load metrics right now.
        </p>
      )}

      {!isLoading && !error && data && data.results?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.results.map((result) => {
            const isTimeseries = result.shape === 'timeseries';
            return (
              <div key={result.metricId}>
                {isTimeseries && (
                  <>
                    <MetricTimeseriesChart
                      key={result.metricId}
                      result={result}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
