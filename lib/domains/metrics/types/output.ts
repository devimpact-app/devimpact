export type MetricError = { code: string; message: string };

export type BaseResult = {
  metricId: string;
  title?: string; // echoed from descriptor for convenience
  unit?: string; // 'seconds', '%', etc.
  meta?: Record<string, any>; // any extra computed info
  error?: MetricError; // when something goes wrong
};

// Shape: stat
export type StatDataset = {
  kind: "current" | "comparison";
  value: number | null;
  // optional deltas for convenience
  deltaAbs?: number | null;
  deltaPct?: number | null; // e.g., (cur - cmp)/|cmp|
};

export type StatResult = BaseResult & {
  shape: "stat";
  data: StatDataset[]; // usually 1 or 2 datasets
};

// Shape: timeseries
export type TimePoint = { t: string; v: number | null }; // t=ISO8601
export type Series = { label: string; points: TimePoint[] };

export type TimeseriesResult = BaseResult & {
  shape: "timeseries";
  series: Series[];
};

// Union
export type MetricResult = StatResult | TimeseriesResult;

// Batch response
export type MetricsBatchResult = {
  results: MetricResult[];
};
