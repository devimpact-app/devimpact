import { MetricInput } from './input';
import { MetricResult } from './output';

export type MetricEntity =
  | 'pr' // authored PRs (your normalized `pull_requests`)
  | 'review' // normalized `reviews`
  | 'repo'
  | 'tenant';

export type WhereOp =
  | {
      col: string;
      op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
      valRef?: string;
      val?: any;
    }
  | {
      col: string;
      op: 'between';
      startRef?: string;
      endRef?: string;
      start?: any;
      end?: any;
    }
  | { col: string; op: 'in'; valsRef?: string; vals?: any[] }
  | { col: string; op: 'is_null' | 'is_not_null' };

export type PlanFormula = {
  kind: 'plan';
  source: 'pullRequests' | 'reviews'; // extend as needed
  operation: 'avg' | 'sum' | 'count' | 'median';
  column?: string;
  timeColumn: string;
  where?: WhereOp[];
  groupBy?: string[]; // future use
};

type DerivedFormula = {
  kind: 'derived';
  dependsOn: string[]; // metricIds
  compute: 'ratio'; // you can expand later
  numerator: string; // metricId
  denominator: string; // metricId
};

/** Programmatic formula */
export type FunctionFormula = {
  kind: 'function';
  compute: (input: MetricInput) => Promise<MetricResult>;
};

/** Raw SQL formula (parameterized) */
export type SqlFormula = {
  kind: 'sql';
  text: (input: MetricInput) => { sql: string; params: any[] };
};

export type MetricFormula =
  | PlanFormula
  | DerivedFormula
  | FunctionFormula
  | SqlFormula;

export type MetricUnit =
  | 'hours'
  | 'count'
  | 'ratio'
  | 'percent'
  | 'files'
  | 'lines';

export type MetricDisplayKind =
  | 'stat' // big number / KPI
  | 'timeseries' // line/area
  | 'histogram' // distribution
  | 'bar' // categorical bars
  | 'table' // rows
  | 'spark' // small sparkline in a stat card
  | 'gauge'; // target vs actual

export type MetricDisplay = {
  label?: string; // overrides descriptor.title in UI, if desired
  description?: string; // short tooltip/help
  valueFormat?: {
    // multiply the raw number by this before display (e.g. seconds → hours)
    scale?: number; // e.g. 1 / 3600

    // what to append after the formatted number, e.g. "h", "s", "%"
    unitSuffix?: string; // e.g. "h"

    // how many decimals to show after scaling
    decimals?: number; // e.g. 1

    // optional: hint for FE if you ever want different styling rules
    kind?: 'duration' | 'ratio' | 'count';
  };
};

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  entity: MetricEntity;
  unit: MetricUnit;
  display: MetricDisplay;
  cacheTtlSeconds?: number;
  formula: MetricFormula;
}
