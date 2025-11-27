import type { TTimeseriesResult } from '@/types/api/metrics';

export function toChartPoints(result: TTimeseriesResult) {
  const series = result.series[0];
  return series.points
    .filter((d) => d.value != null)
    .map((d) => ({
      // using midpoint as x
      x: new Date(d.bucketMidpoint),
      value: d.value as number,
    }))
    .sort((a, b) => a.x.getTime() - b.x.getTime());
}
