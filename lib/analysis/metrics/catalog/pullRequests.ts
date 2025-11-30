import { MetricDefinition } from '../types/definition';

export const PR_LEAD_TIME_SECONDS_V1: MetricDefinition = {
  id: 'pr.lead_time_seconds.v1',
  name: 'PR lead time (median)',
  description: 'Median seconds from first commit to merge for authored PRs.',
  entity: 'pr',
  unit: 'hours',
  display: {
    label: 'Lead time (median)',
    description: 'First commit → merge (merged PRs only)',
    valueFormat: {
      scale: 1 / 3600,
      unitSuffix: 'h',
      decimals: 1,
      kind: 'duration',
    },
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'pullRequests',
    operation: 'median',
    column: 'leadTimeSeconds',
    timeColumn: 'mergedAt',
    where: [
      { col: 'authorIsTenant', op: 'eq', val: true },
      { col: 'mergedAt', op: 'between', startRef: 'start', endRef: 'end' },
      { col: 'leadTimeSeconds', op: 'is_not_null' },
    ],
  },
};

export const PR_TIME_TO_FIRST_REVIEW_V1: MetricDefinition = {
  id: 'pr.time_to_first_review.v1',
  name: 'PR Time to First Review',
  description:
    'Median seconds from ready to review until first review for authored PRs',
  entity: 'pr',
  unit: 'hours',
  display: {
    label: 'Time to first review on your PRs',
    description:
      'How long your PRs wait before receiving the first review from someone else',
    valueFormat: {
      scale: 1 / 3600,
      unitSuffix: 'h',
      decimals: 1,
      kind: 'duration',
    },
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'pullRequests',
    operation: 'median',
    column: 'timeToFirstReviewSeconds',
    timeColumn: 'mergedAt',
    where: [
      { col: 'authorIsTenant', op: 'eq', val: true },
      { col: 'mergedAt', op: 'between', startRef: 'start', endRef: 'end' },
      { col: 'timeToFirstReviewSeconds', op: 'is_not_null' },
    ],
  },
};

export const AUTHORED_PRS_COUNT_V1: MetricDefinition = {
  id: 'pr.authored_merged_count.v1',
  name: 'Merged PRs authored',
  description:
    'Count of PRs authored by the tenant that were merged within the selected window.',
  entity: 'pr',
  unit: 'count',
  display: {
    label: 'Merged PRs',
    description: 'PRs you authored and merged in this period',
    valueFormat: {
      scale: 1,
      unitSuffix: 'prs',
      decimals: 0,
      kind: 'count',
    },
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'pullRequests',
    operation: 'count',
    timeColumn: 'mergedAt',
    where: [
      { col: 'authorIsTenant', op: 'eq', val: true },
      { col: 'mergedAt', op: 'between', startRef: 'start', endRef: 'end' },
    ],
  },
};

export const AUTHORED_PRS_WITH_BLOCKING_REVIEW_COUNT_V1: MetricDefinition = {
  id: 'pr.authored_with_blocking_review_count.v1',
  name: 'PRs blocked on first review',
  description:
    'Count of PRs authored by the tenant that had atleast one blocking review',
  entity: 'pr',
  unit: 'count',
  display: {
    label: 'PRs blocked on first review',
    description: 'Count of your PRs that had at least one blocking review',
    valueFormat: {
      scale: 1,
      unitSuffix: 'prs',
      decimals: 0,
      kind: 'count',
    },
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'pullRequests',
    operation: 'count',
    timeColumn: 'mergedAt',
    where: [
      { col: 'authorIsTenant', op: 'eq', val: true },
      { col: 'mergedAt', op: 'between', startRef: 'start', endRef: 'end' },
      { col: 'blockingReviewCount', op: 'gte', val: 1 },
    ],
  },
};

export const BLOCKED_PRS_RATE_V1: MetricDefinition = {
  id: 'pr.blocked_rate.v1',
  name: 'PRs blocked on first review',
  description:
    'Percentage of your reviews that included code comments during the selected window.',
  entity: 'pr',
  unit: 'percent',
  display: {
    label: 'PRs blocked on first review',
    description:
      'Percentage of your merged PRs that didn’t pass the first review',
    valueFormat: {
      scale: 100,
      unitSuffix: '%',
      decimals: 0,
      kind: 'ratio',
    },
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'derived',
    dependsOn: [
      'pr.authored_with_blocking_review_count.v1',
      'pr.authored_merged_count.v1',
    ],
    compute: 'ratio',
    numerator: 'pr.authored_with_blocking_review_count.v1',
    denominator: 'pr.authored_merged_count.v1',
  },
};

export const PR_SIZE_LINES_CHANGED_MEDIAN_V1: MetricDefinition = {
  id: 'pr.size_lines_changed_median.v1',
  name: 'PR size (median lines changed)',
  description:
    'Median number of lines changed per merged PR you authored in the selected window.',
  entity: 'pr',
  unit: 'lines',
  display: {
    label: 'Typical PR size',
    description: 'Median lines changed per merged PR you authored',
    valueFormat: {
      scale: 1,
      unitSuffix: 'lines',
      decimals: 0,
      kind: 'count',
    },
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'pullRequests',
    operation: 'median',
    column: 'linesChanged',
    timeColumn: 'mergedAt',
    where: [
      { col: 'authorIsTenant', op: 'eq', val: true },
      { col: 'mergedAt', op: 'between', startRef: 'start', endRef: 'end' },
      { col: 'linesChanged', op: 'is_not_null' },
    ],
  },
};
