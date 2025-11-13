import { MetricDefinition } from "../types/definition";

export const PR_LEAD_TIME_SECONDS_V1: MetricDefinition = {
  id: "pr.lead_time_seconds.v1",
  name: "PR lead time (median)",
  description: "Median seconds from first commit to merge for authored PRs.",
  entity: "pr",
  unit: "seconds",
  source: {
    table: "pullRequests",
    columns: ["tenantId", "authorIsTenant", "mergedAt", "leadTimeSeconds"],
  },
  display: {
    kind: "stat",
    label: "Lead time (median)",
    description: "First commit → merge (merged PRs only)",
    decimals: 0,
    unitSuffix: "s",
  },
  cacheTtlSeconds: 300,
  // TODO: update to median
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

export const AUTHORED_PRS_COUNT_V1: MetricDefinition = {
  id: "pr.authored_merged_count.v1",
  name: "Merged PRs authored",
  description:
    "Count of PRs authored by the tenant that were merged within the selected window.",
  entity: "pr",
  unit: "count",
  source: {
    table: "pullRequests",
    columns: ["tenantId", "authorIsTenant", "mergedAt"],
  },
  display: {
    kind: "stat",
    label: "Merged PRs",
    description: "PRs you authored and merged in this period",
    decimals: 0,
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: "plan",
    source: "pullRequests",
    operation: "count",
    where: [
      { col: "authorIsTenant", op: "eq", val: true },
      { col: "mergedAt", op: "between", startRef: "start", endRef: "end" },
    ],
  },
};

export const PR_SIZE_LINES_CHANGED_MEDIAN_V1: MetricDefinition = {
  id: "pr.size_lines_changed_median.v1",
  name: "PR size (median lines changed)",
  description:
    "Median number of lines changed per merged PR you authored in the selected window.",
  entity: "pr",
  unit: "lines",
  source: {
    table: "pullRequests",
    columns: ["tenantId", "authorIsTenant", "mergedAt", "linesChanged"],
  },
  display: {
    kind: "stat",
    label: "Typical PR size",
    description: "Median lines changed per merged PR you authored",
    decimals: 0,
    // you can either render the unit yourself or:
    unitSuffix: " lines",
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: "plan",
    source: "pullRequests",
    operation: "avg", // TODO: switch to "median" when available
    column: "linesChanged",
    where: [
      { col: "authorIsTenant", op: "eq", val: true },
      { col: "mergedAt", op: "between", startRef: "start", endRef: "end" },
      { col: "linesChanged", op: "is_not_null" },
    ],
  },
};
