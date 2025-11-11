export type ResultShape =
  | "stat" // single number (optionally with comparison)
  | "timeseries"; // points over time

export type Granularity = "hour" | "day" | "week" | "month" | "quarter";

export type Breakdown = {
  by: "repo" | "reviewer" | "team" | "state";
  limit?: number;
  order?: "asc" | "desc";
};

export type Comparison =
  | { kind: "none" }
  | { kind: "previous_period" } // same length window prior to {start,end}
  | { kind: "yoy" } // year-over-year
  | { kind: "custom"; start: Date; end: Date }; // explicit

export type MetricInput = {
  tenantId: string;
  // time window
  start: Date;
  end: Date;

  // shape & options requested by the FE
  shape: ResultShape;
  granularity?: Granularity; // for timeseries
  breakdowns?: Breakdown[]; // e.g., top repos
  comparison?: Comparison; // add baseline

  // optional filters (server-validated)
  filters?: Record<string, string | number | boolean | null>;

  // paging only applies to table shape
  page?: number; // 1-based
  pageSize?: number; // default on server
};

// Batch request (one panel can ask for multiple metrics)
export type MetricsBatchInput = {
  requests: Array<{
    metricId: string; // id from your catalog
    input: MetricInput; // per-metric input
  }>;
};
