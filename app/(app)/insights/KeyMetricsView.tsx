'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { TMetricsBatchResult } from '@/types/api/metrics';
import { TMetricsBatchInput } from '@/types/api/metrics';
import { MetricsAPI } from '@/lib/analysis/metrics/client';
import { MetricSparkline } from './MetricSparkline';
import { toChartPoints } from './utils';
import { MetricTimeseriesChart } from './MetricTimeseriesChart';

type DateRange = {
  start: Date;
  end: Date;
};

type KeyMetricsPanelProps = {
  range: DateRange;
};

type KeyMetricsState = {
  data: TMetricsBatchResult | null;
  isLoading: boolean;
  error: string | null;
};

function useKeyMetrics(range: DateRange): KeyMetricsState {
  const [state, setState] = useState<KeyMetricsState>({
    data: null,
    isLoading: true,
    error: null,
  });

  // Keep a stable ISO window for the API
  const windowIso = useMemo(
    () => ({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    }),
    [range.start, range.end]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const metricIds = [
          'pr.time_to_first_review.v1',
          'review.latency_seconds.avg.v1',
          'pr.blocked_rate.v1',
        ];
        if (metricIds.length === 0) {
          if (!cancelled) {
            setState({
              data: {
                results: [],
              } as TMetricsBatchResult,
              isLoading: false,
              error: null,
            });
          }
          return;
        }

        const batchInput: TMetricsBatchInput = {
          requests: metricIds.map((id) => ({
            metricId: id,
            input: {
              shape: 'timeseries',
              start: windowIso.start,
              end: windowIso.end,
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
  }, [windowIso.start, windowIso.end]);

  return state;
}

export function KeyMetricsPanel({ range }: KeyMetricsPanelProps) {
  const { data, isLoading, error } = useKeyMetrics(range);

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-2xl border border-slate-800/80 bg-[#0b0f1a]/80 p-4 shadow-sm shadow-black/40">
        <header className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Key metrics
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              High-level trends for this period
            </p>
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
          <div className="space-y-2">
            {data.results.map((result) => {
              const isTimeseries = result.shape === 'timeseries';
              return (
                <div>
                  {isTimeseries && (
                    <>
                      <MetricTimeseriesChart
                        key={result.metricId}
                        result={result}
                      />
                    </>
                  )}
                  {!isTimeseries && (
                    <div
                      key={result.metricId}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-200">
                          {result.title ?? result.metricId}
                        </span>
                        {result.unit && (
                          <span className="text-[10px] text-slate-500">
                            {result.unit}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        {!isTimeseries && (
                          <span className="text-sm font-semibold text-slate-50">
                            {result.data?.[0]?.value ?? '—'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading &&
          !error &&
          data &&
          (!data.results || data.results.length === 0) && (
            <p className="text-[11px] text-slate-500">
              No metrics available yet for this period.
            </p>
          )}
      </div>
    </aside>
  );
}
