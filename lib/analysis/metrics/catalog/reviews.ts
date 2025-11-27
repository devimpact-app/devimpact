import { MetricDefinition } from '../types/definition';

export const REVIEWS_GIVEN_COUNT_V1: MetricDefinition = {
  id: 'review.given_count.v1',
  name: 'Reviews given',
  description:
    'Count of code reviews submitted by the tenant within the selected window.',
  entity: 'review',
  unit: 'count',
  source: {
    table: 'reviews',
    columns: ['tenantId', 'reviewerIsTenant', 'submittedAt', 'state'],
  },
  display: {
    kind: 'stat',
    label: 'Reviews given',
    description: 'Reviews you submitted in this period',
    decimals: 0,
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'reviews',
    operation: 'count',
    timeColumn: 'submittedAt',
    where: [
      { col: 'reviewerIsTenant', op: 'eq', val: true },
      { col: 'submittedAt', op: 'between', startRef: 'start', endRef: 'end' },
      { col: 'submittedAt', op: 'is_not_null' },
    ],
  },
};

export const REVIEW_LATENCY_SECONDS_AVG_V1: MetricDefinition = {
  id: 'review.latency_seconds.avg.v1',
  name: 'Avg review latency (seconds)',
  description:
    'Average time from the relevant request/anchor to the reviewer’s submission, for reviews made by the tenant within the window.',
  entity: 'review',
  unit: 'seconds',
  source: {
    table: 'reviews',
    columns: [
      'tenantId',
      'reviewerIsTenant',
      'submittedAt',
      'reviewLatencySeconds',
    ],
  },
  display: {
    kind: 'stat',
    label: 'Avg review latency',
    description: 'Anchor → review submission',
    decimals: 0,
    unitSuffix: 's',
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'reviews',
    operation: 'median',
    column: 'reviewLatencySeconds',
    timeColumn: 'submittedAt',
    where: [
      { col: 'reviewerIsTenant', op: 'eq', val: true },
      { col: 'submittedAt', op: 'between', startRef: 'start', endRef: 'end' },
    ],
  },
};

export const REVIEW_FIRST_RESPONDER_COUNT_V1: MetricDefinition = {
  id: 'review.first_responder.count.v1',
  name: 'First-responder reviews (count)',
  description:
    'Number of reviews by the tenant that were the first review on a PR (within the window).',
  entity: 'review',
  unit: 'count',
  source: {
    table: 'reviews',
    columns: ['tenantId', 'reviewerIsTenant', 'submittedAt', 'wasFirstReview'],
  },
  display: {
    kind: 'stat',
    label: 'First responder',
    description: 'You were the first to review',
    decimals: 0,
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'reviews',
    operation: 'count',
    timeColumn: 'submittedAt',
    where: [
      { col: 'reviewerIsTenant', op: 'eq', val: true },
      { col: 'wasFirstReview', op: 'eq', val: true },
      { col: 'submittedAt', op: 'between', startRef: 'start', endRef: 'end' },
    ],
  },
};

export const REVIEW_SUBSTANTIVE_COUNT_V1: MetricDefinition = {
  id: 'review.substantive_count.v1',
  name: 'Substantive reviews (count)',
  description:
    'Number of reviews you submitted in this period that included at least one code comment.',
  entity: 'review',
  unit: 'count',
  source: {
    table: 'reviews',
    columns: [
      'tenantId',
      'reviewerIsTenant',
      'submittedAt',
      'reviewCommentsCount',
    ],
  },
  display: {
    kind: 'stat',
    label: 'Substantive reviews',
    description: 'Reviews with code comments',
    decimals: 0,
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'reviews',
    operation: 'count',
    timeColumn: 'submittedAt',
    // TODO: also count reviews where body length significant
    where: [
      { col: 'reviewerIsTenant', op: 'eq', val: true },
      { col: 'submittedAt', op: 'between', startRef: 'start', endRef: 'end' },
      { col: 'submittedAt', op: 'is_not_null' },
      { col: 'reviewCommentsCount', op: 'gt', val: 0 },
    ],
  },
};

export const REVIEW_SUBSTANTIVE_RATE_V1: MetricDefinition = {
  id: 'review.substantive_rate.v1',
  name: 'Substantive review rate',
  description:
    'Percentage of your reviews that included code comments during the selected window.',
  entity: 'review',
  unit: 'percent',
  source: {
    table: 'reviews',
    columns: [],
  },
  display: {
    kind: 'stat',
    label: 'Substantive reviews',
    description: 'Share of your reviews that had code comments',
    decimals: 0,
    unitSuffix: '%',
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'derived',
    dependsOn: ['review.substantive_count.v1', 'review.given_count.v1'],
    compute: 'ratio',
    numerator: 'review.substantive_count.v1',
    denominator: 'review.given_count.v1',
  },
};
