import { z } from 'zod';

/* ------- shared enums ------- */
export const ResultShape = z.enum(['stat', 'timeseries']);
export const Granularity = z.enum(['hour', 'day', 'week', 'month', 'quarter']);
export const BreakdownBy = z.enum(['repo', 'reviewer', 'team', 'state']);
export const MetricId = z.string().min(1);

/* ------- input ------- */
export const Breakdown = z.object({
  by: BreakdownBy,
  limit: z.number().int().positive().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
export const Comparison = z.union([
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('previous_period') }),
  z.object({
    kind: z.literal('custom'),
    start: z.string(), // ISO from FE
    end: z.string(),
  }),
]);

export const MetricInput = z.object({
  start: z.string(), // ISO
  end: z.string(), // ISO
  shape: ResultShape,
  granularity: Granularity.optional(),
  breakdowns: z.array(Breakdown).optional(),
  comparison: Comparison.optional(),
  filters: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

export const MetricsBatchInput = z.object({
  requests: z.array(
    z.object({
      metricId: MetricId,
      input: MetricInput,
    })
  ),
});

/* ------- catalog ------- */
export const CatalogItem = z.object({
  id: MetricId,
  name: z.string(),
  description: z.string(),
  entity: z.enum(['pr', 'review', 'repo', 'tenant']),
  unit: z.enum(['seconds', 'count', 'ratio', 'percent', 'files', 'lines']),
  source: z.object({
    table: z.enum(['pullRequests', 'reviews']),
    columns: z.array(z.string()),
  }),
  display: z.object({
    kind: z.enum([
      'stat',
      'timeseries',
      'histogram',
      'bar',
      'table',
      'spark',
      'gauge',
    ]),
    label: z.string().optional(),
    description: z.string().optional(),
    decimals: z.number().int().min(0).optional(),
    unitSuffix: z.string().optional(),
    yAxisLabel: z.string().optional(),
    xAxisLabel: z.string().optional(),
  }),
  cacheTtlSeconds: z.number().int().positive().optional(),
});
export const CatalogResponse = z.object({
  metrics: z.array(CatalogItem),
});

/* ------- results ------- */
const ValueFormat = z.object({
  scale: z.number().optional(),
  decimals: z.number().optional(),
  unitSuffix: z.string().optional(),
  kind: z.enum(['duration', 'ratio', 'count']).optional(),
});
const Aggregation = z.object({
  op: z.enum(['count', 'avg', 'sum', 'median']),
});
const BaseResult = z.object({
  metricId: MetricId,
  title: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
  window: z.object({ start: z.string(), end: z.string() }),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  valueFormat: ValueFormat.optional(),
  aggregation: Aggregation.optional(),
});
const StatDataset = z.object({
  kind: z.enum(['current', 'comparison']),
  value: z.number().nullable(),
  deltaAbs: z.number().nullable().optional(),
  deltaPct: z.number().nullable().optional(),
});
export const StatResult = BaseResult.extend({
  shape: z.literal('stat'),
  data: z.array(StatDataset),
});
export const TimeSeriesPoint = z.object({
  bucketStart: z.string(),
  bucketEnd: z.string(),
  bucketMidpoint: z.string(),
  value: z.number().nullable(),
});
export const TimeSeries = z.object({
  label: z.string(),
  points: z.array(TimeSeriesPoint),
});
export const TimeseriesResult = BaseResult.extend({
  shape: z.literal('timeseries'),
  series: z.array(TimeSeries),
});
export const MetricResult = z.union([StatResult, TimeseriesResult]);
export const MetricsBatchResult = z.object({
  results: z.array(MetricResult),
});

export type TMetricInput = z.infer<typeof MetricInput>;
export type TMetricsBatchInput = z.infer<typeof MetricsBatchInput>;
export type TMetricResult = z.infer<typeof MetricResult>;
export type TStatResult = z.infer<typeof StatResult>;
export type TTimeseriesResult = z.infer<typeof TimeseriesResult>;
export type TMetricsBatchResult = z.infer<typeof MetricsBatchResult>;
export type TCatalogItem = z.infer<typeof CatalogItem>;
export type TCatalogResponse = z.infer<typeof CatalogResponse>;
