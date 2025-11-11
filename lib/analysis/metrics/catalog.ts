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
    table: "pull_requests",
    columns: [
      "tenant_id",
      "author_is_tenant",
      "merged_at",
      "lead_time_seconds",
    ],
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
    source: "pull_requests",
    operation: "avg",
    column: "lead_time_seconds",
    where: [
      { col: "tenant_id", op: "eq", valRef: "tenantId" },
      { col: "author_is_tenant", op: "eq", val: true },
      { col: "merged_at", op: "between", startRef: "start", endRef: "end" },
      { col: "lead_time_seconds", op: "is_not_null" },
    ],
  },
};

export const ALL_METRICS: MetricDefinition[] = [PR_LEAD_TIME_SECONDS_V1];
