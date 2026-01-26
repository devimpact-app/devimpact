import type { TTimeseriesResult } from '@/types/api/metrics';

export function toChartPoints(result: TTimeseriesResult) {
  const series = result.series[0];
  const now = new Date();
  return series.points
    .map((d) => ({
      x: new Date(d.bucketStart),
      value: d.value ?? (0 as number),
      isDotted: new Date(d.bucketEnd) > now,
    }))
    .sort((a, b) => a.x.getTime() - b.x.getTime());
}
