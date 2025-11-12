import { MetricDefinition } from "./types/definition";

export const PR_LEAD_TIME_SECONDS_V1: MetricDefinition = {
  id: "pr.lead_time_seconds.v1",
  name: "PR lead time (first commit → merge)",
  description:
    "Average seconds from the first commit on a PR to when it was merged. " +
    "Only includes PRs authored by the tenant and merged within the requested window.",
  entity: "pr",
  unit: "seconds",
  source: {
    table: "pullRequests",
    columns: ["tenantId", "authorIsTenant", "mergedAt", "leadTimeSeconds"],
  },
  display: {
    kind: "stat",
    label: "Avg lead time",
    description: "First commit → merge (merged PRs only)",
    decimals: 0,
    unitSuffix: "s",
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: "plan",
    source: "pullRequests",
    operation: "avg",
    column: "leadTimeSeconds",
    where: [
      { col: "authorIsTenant", op: "eq", val: true },
      { col: "mergedAt", op: "between", startRef: "start", endRef: "end" },
      { col: "leadTimeSeconds", op: "is_not_null" },
    ],
  },
};

export const ALL_METRICS: MetricDefinition[] = [PR_LEAD_TIME_SECONDS_V1];
export const METRIC_CATALOG_MAP = {
  [PR_LEAD_TIME_SECONDS_V1.id]: PR_LEAD_TIME_SECONDS_V1,
};
