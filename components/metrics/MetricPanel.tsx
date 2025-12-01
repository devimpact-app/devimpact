'use client';

import { MetricTimeseriesChart } from '@/app/(app)/insights/MetricTimeseriesChart';
import { MetricsAPI } from '@/lib/analysis/metrics/client';
import { cn } from '@/lib/utils';
import { formatRange, inferWindowWeeks } from '@/lib/utils/date';
import { TMetricsBatchInput, TMetricsBatchResult } from '@/types/api/metrics';
import { OneOnOneMetricSnapshot } from '@/types/api/one-on-one';
import { Info, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type MetricDetailPanelProps = {
  metric: OneOnOneMetricSnapshot;
  onClose: () => void;
};

type MetricState = {
  data: TMetricsBatchResult | null;
  isLoading: boolean;
  error: string | null;
};

export function MetricPanel({ metric, onClose }: MetricDetailPanelProps) {
  const [state, setState] = useState<MetricState>({
    data: null,
    isLoading: true,
    error: null,
  });
  useEffect(() => {
    async function load() {
      const windowWeeks = inferWindowWeeks(
        new Date(metric.windowStart),
        new Date(metric.windowEnd)
      );
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const metricId = metric.id;
        const batchInput: TMetricsBatchInput = {
          requests: [
            {
              metricId,
              input: {
                shape: 'stat',
                start: metric.windowStart,
                windowWeeks,
                comparison: {
                  kind: 'previous_period',
                },
              },
            },
            {
              metricId,
              input: {
                shape: 'timeseries',
                start: metric.windowStart,
                windowWeeks,
              },
            },
          ],
        };
        const batchResult = await MetricsAPI.runBatch(batchInput);
        setState({
          data: batchResult,
          isLoading: false,
          error: null,
        });
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err?.message ?? 'Failed to load metrics',
        }));
      }
    }

    load();
  }, [metric.id, metric.windowStart, metric.windowEnd]);

  const {
    metricTitle,
    metricDescription,
    rangeLabel,
    aggregation,
    unit,
    currentValue,
    comparisonValue,
    timeseriesResult,
  } = useMemo(() => {
    const results = state.data?.results ?? [];
    const metricTitle = results.find((r) => !!r.title)?.title;
    const metricDescription = results.find((r) => !!r.description)?.description;
    let range = null;
    if (results.length > 0) {
      const window = results[0].window;
      range = formatRange(new Date(window.start), new Date(window.end));
    }
    const statResult = results.find((r) => r.shape === 'stat');
    let currentValue = null;
    let comparisonValue = null;
    if (statResult) {
      const current = statResult.data.find((d) => d.kind === 'current');
      const comparison = statResult.data.find((d) => d.kind === 'comparison');
      currentValue = current?.value;
      comparisonValue = comparison?.value;
    }
    return {
      metricTitle,
      metricDescription,
      rangeLabel: range,
      aggregation: results.find((r) => !!r.aggregation?.op)?.aggregation?.op,
      unit: results.find((r) => !!r.unit)?.unit,
      currentValue,
      comparisonValue,
      timeseriesResult: results.find((r) => r.shape === 'timeseries'),
    };
  }, [state.data?.results.length]);

  const aggregationAndUnitSame = aggregation === unit;

  return (
    <aside
      className={cn(
        'fixed right-0 top-0 bottom-0 w-full max-w-[480px]',
        'bg-surface-alt border-l border-border shadow-2xl z-50',
        'flex flex-col px-4 py-3 animate-slideIn'
      )}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="inline-flex flex-wrap items-center gap-2">
            {(aggregation || unit) && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px]',
                  'border-slate-700/80 bg-slate-950/80 text-slate-200'
                )}
              >
                {aggregation && (
                  <span className="font-medium">{aggregation}</span>
                )}
                {aggregation && unit && !aggregationAndUnitSame && (
                  <span className="text-slate-500/80">·</span>
                )}
                {unit && !aggregationAndUnitSame && (
                  <span className="text-slate-300">{unit}</span>
                )}
              </span>
            )}

            {rangeLabel && (
              <span className="text-[11px] text-slate-500">{rangeLabel}</span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 transition-colors ml-1"
          aria-label="Close metric inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-5 space-y-1">
        <h2 className="text-sm font-semibold text-slate-50 leading-snug">
          {metricTitle}
        </h2>
        {metricDescription && (
          <p className="text-[11px] text-slate-400">{metricDescription}</p>
        )}
      </div>

      <div className="mt-4 flex-1 space-y-6 overflow-y-auto pb-4 pr-1 no-scrollbar">
        <section>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Current value
          </h3>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 flex items-baseline justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold text-slate-50">
                {currentValue}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {`${unit} over this period`}
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              {comparisonValue}
            </div>
          </div>
        </section>

        {/* Timeseries chart */}
        <section>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Trend over time
          </h3>
          {timeseriesResult && (
            <MetricTimeseriesChart result={timeseriesResult} />
          )}
          {/* <p className="mt-2 text-[11px] text-slate-500">
            </p> */}
        </section>
      </div>
    </aside>
  );
}
