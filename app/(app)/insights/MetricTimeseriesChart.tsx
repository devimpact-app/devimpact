// components/metrics/MetricTimeseriesChart.tsx
'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

type Point = { x: Date; value: number };

type MetricTimeseriesChartProps = {
  title: string;
  unit?: string | null;
  points: Point[];
};

function formatDateTick(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`; // e.g. 1/23
}

export function MetricTimeseriesChart({
  title,
  unit,
  points,
}: MetricTimeseriesChartProps) {
  if (!points.length) return null;

  console.log('points', points);
  const data = points.map((p) => ({
    ts: p.x.getTime(),
    value: p.value,
  }));

  const dataMin = data[0]?.ts;
  const dataMax = data[data.length - 1]?.ts;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">{title}</h3>
          {unit && <p className="text-[10px] text-slate-400">{unit}</p>}
        </div>
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
              width={40}
            />
            <Tooltip
              labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
              formatter={(val: any) => [unit ? `${val} ${unit}` : val, title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              dot={false}
              strokeWidth={1.6}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
