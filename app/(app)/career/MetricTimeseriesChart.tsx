'use client';

import { TMetricResult, TTimeseriesResult } from '@/types/api/metrics';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { toChartPoints } from './utils';
import { InfoTooltip } from '@/components/InfoTooltip';
import { ChartTooltip } from '@/components/ChartTooltip';
import { formatMetricValue } from '@/lib/analysis/metrics/client';
import { cn } from '@/lib/utils';

type MetricTimeseriesChartProps = {
  result: TTimeseriesResult;
  onClick?: (result: TTimeseriesResult) => void;
};

function formatDateTick(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`; // e.g. 1/23
}

export function MetricTimeseriesChart({
  result,
  onClick,
}: MetricTimeseriesChartProps) {
  const points = toChartPoints(result);
  const isCount =
    result.aggregation?.op === 'count' || result.aggregation?.op === 'sum';
  if (!points.length) return null;

  const base = points.map((p) => ({
    ts: p.x.getTime(),
    value: p.value,
    isDotted: p.isDotted,
  }));

  const dataMin = base[0]?.ts;
  const dataMax = base[base.length - 1]?.ts;

  const firstDottedIdx = base.findIndex((d) => d.isDotted);

  let description = '';
  if (result.description) {
    description = result.description;
    if (result.unit) {
      description = `${result.description} in ${result.unit}`;
    }
  }

  const data = base.map((d, idx) => {
    const isPartialSegment =
      firstDottedIdx !== -1 &&
      (idx === firstDottedIdx || idx === firstDottedIdx - 1);

    return {
      ts: d.ts,
      isDotted: d.isDotted,
      solidValue: d.isDotted ? null : d.value,
      dottedValue: isPartialSegment ? d.value : null,
    };
  });

  const numericValues = data
    .map((d) => d.solidValue ?? d.dottedValue)
    .filter((v): v is number => v != null);

  const rawMin = numericValues.length ? Math.min(...numericValues) : 0;
  const rawMax = numericValues.length ? Math.max(...numericValues) : 0;

  const domainMin = Math.min(0, Math.floor(rawMin));
  const domainMax = Math.max(domainMin + 1, Math.ceil(rawMax));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          {onClick ? (
            <button
              type="button"
              onClick={() => onClick(result)}
              className={cn(
                'text-left text-xs font-semibold text-slate-100',
                'hover:underline hover:decoration-slate-300',
                'focus:outline-none focus:ring-1 focus:ring-slate-600 rounded-sm'
              )}
            >
              {result.title}
              {result.aggregation ? ` (${result.aggregation.op}, weekly)` : ''}
            </button>
          ) : (
            <h3 className="text-xs font-semibold text-slate-100">
              {result.title}
              {result.aggregation ? ` (${result.aggregation.op}, weekly)` : ''}
            </h3>
          )}
        </div>

        {result.description && <InfoTooltip description={description} />}
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              strokeOpacity={0.3}
            />
            <XAxis
              dataKey="ts"
              tickFormatter={formatDateTick}
              type="number"
              scale="time"
              domain={[dataMin, dataMax]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={{ stroke: '#1e293b' }}
              allowDecimals={!isCount}
              tickLine={false}
              width={50}
              tickFormatter={(val: number) =>
                val ? formatMetricValue(result.valueFormat, val) : ''
              }
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(val: any) =>
                    formatMetricValue(result.valueFormat, val)
                  }
                />
              }
            />
            <Line
              type="monotone"
              dataKey="solidValue"
              dot={false}
              strokeWidth={1.6}
              activeDot={{ r: 3 }}
            />

            <Line
              type="monotone"
              dataKey="dottedValue"
              dot={false}
              strokeWidth={1.6}
              strokeDasharray="4 4"
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-[-8px] flex w-full justify-center">
          <p className="text-[10px] text-slate-500">
            * Each point is the{' '}
            <span className="font-medium">week starting</span> on this date.
          </p>
        </div>
      </div>
    </div>
  );
}
