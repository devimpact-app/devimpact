import { MetricInput } from "./input";
import { MetricResult } from "./output";

export type MetricId = "pr.lead_time_seconds.v1";

export type MetricEntity =
  | "pr" // authored PRs (your normalized `pull_requests`)
  | "review" // normalized `reviews`
  | "repo"
  | "tenant";

export type WhereOp =
  | {
      col: string;
      op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
      valRef?: string;
      val?: any;
    }
  | {
      col: string;
      op: "between";
      startRef?: string;
      endRef?: string;
      start?: any;
      end?: any;
    }
  | { col: string; op: "in"; valsRef?: string; vals?: any[] }
  | { col: string; op: "is_null" | "is_not_null" };

export type PlanFormula = {
  kind: "plan";
  source: "pullRequests" | "reviews"; // extend as needed
  operation: "avg" | "sum" | "count";
  column?: string;
  where?: WhereOp[];
  groupBy?: string[]; // future use
};

/** Programmatic formula */
export type FunctionFormula = {
  kind: "function";
  compute: (input: MetricInput) => Promise<MetricResult>;
};

/** Raw SQL formula (parameterized) */
export type SqlFormula = {
  kind: "sql";
  text: (input: MetricInput) => { sql: string; params: any[] };
};

export type MetricFormula = PlanFormula | FunctionFormula | SqlFormula;

export type MetricUnit =
  | "seconds"
  | "count"
  | "ratio"
  | "percent"
  | "files"
  | "lines";

export type MetricDisplayKind =
  | "stat" // big number / KPI
  | "timeseries" // line/area
  | "histogram" // distribution
  | "bar" // categorical bars
  | "table" // rows
  | "spark" // small sparkline in a stat card
  | "gauge"; // target vs actual

export type MetricDisplay = {
  kind: MetricDisplayKind;
  // Human-facing labels/hints
  label?: string; // overrides descriptor.title in UI, if desired
  description?: string; // short tooltip/help
  decimals?: number; // suggested decimal places
  unitSuffix?: string; // e.g., "s", "ms", "%"
  // For charts
  yAxisLabel?: string;
  xAxisLabel?: string;
};

export interface MetricDefinition {
  id: MetricId;
  name: string;
  description: string;
  entity: MetricEntity;
  unit: MetricUnit;
  source: {
    table: "pullRequests" | "reviews";
    columns: string[];
  };
  display: MetricDisplay;
  cacheTtlSeconds?: number;
  formula: MetricFormula;
}
