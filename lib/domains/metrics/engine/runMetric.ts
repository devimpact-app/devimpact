import { METRIC_CATALOG_MAP } from '../catalog';
import { MetricDefinition } from '../types/definition';
import { MetricContext, MetricInput } from '../types/input';
import { computeComparisonWindow } from './comparisonWindow';
import { toDate } from '@/lib/utils/date';
import { mergePrimaryAndComparison } from './mergeResults';
import { executeMetric } from './executeMetric';
import { TMetricResult } from '@/types/api/metrics';

export async function runMetric(
  metric: string | MetricDefinition,
  input: MetricInput,
  ctx: MetricContext
): Promise<TMetricResult> {
  const def = typeof metric === 'string' ? METRIC_CATALOG_MAP[metric] : metric;

  if (!def)
    throw new Error(
      `Metric not found: ${typeof metric === 'string' ? metric : metric.id}`
    );

  return runMetricWithDefinition(def, input, ctx);
}

async function runMetricWithDefinition(
  def: MetricDefinition,
  input: MetricInput,
  ctx: MetricContext
): Promise<TMetricResult> {
  const primary = await executeMetric(def, input, ctx);

  const comparisonWindow = computeComparisonWindow({
    primaryStart: input.start,
    primaryEnd: input.end,
    cmp:
      input.comparison?.kind === 'custom'
        ? {
            kind: 'custom',
            start: toDate(input.comparison.start),
            end: toDate(input.comparison.end),
          }
        : input.comparison,
  });

  if (comparisonWindow.kind === 'none') {
    return primary;
  }

  const comparison = await executeMetric(
    def,
    { ...input, start: comparisonWindow.start, end: comparisonWindow.end },
    ctx
  );

  const merged = mergePrimaryAndComparison(primary, comparison);
  return merged;
}
