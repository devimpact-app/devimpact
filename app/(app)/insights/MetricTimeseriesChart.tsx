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

type MetricTimeseriesChartProps = {
  result: TTimeseriesResult;
};

function formatDateTick(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`; // e.g. 1/23
}

function formatMetricValue(
  valueFormat: TMetricResult['valueFormat'],
  rawValue: number | null
): string {
  if (rawValue == null) return '—';

  const vf = valueFormat;
  const scale = vf?.scale ?? 1;
  const decimals = vf?.decimals ?? 0;
  const unitSuffix = vf?.unitSuffix ?? '';

  const scaled = rawValue * scale;
  const formatted = scaled.toFixed(decimals);

  return unitSuffix ? `${formatted} ${unitSuffix}` : formatted;
}

export function MetricTimeseriesChart({ result }: MetricTimeseriesChartProps) {
  const points = toChartPoints(result);
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

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">
            {result.title}
            {result.aggregation ? ` (${result.aggregation.op})` : ''}
          </h3>
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
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={{ stroke: '#1e293b' }}
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
      </div>
    </div>
  );
}
