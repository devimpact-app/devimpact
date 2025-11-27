'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

type Point = { x: Date; value: number };

type MetricSparklineProps = {
  points: Point[];
};

export function MetricSparkline({ points }: MetricSparklineProps) {
  if (!points.length) return null;

  // Recharts wants plain values, so map Date -> timestamp
  const data = points.map((p) => ({
    ts: p.x.getTime(),
    value: p.value,
  }));

  return (
    <div className="h-16 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" dot={false} strokeWidth={1.4} />
          <Tooltip
            formatter={(val: any) => [val, 'Value']}
            labelFormatter={() => ''}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
