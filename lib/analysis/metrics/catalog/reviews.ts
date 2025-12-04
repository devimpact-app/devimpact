import { MetricDefinition } from '../types/definition';

export const REVIEWS_GIVEN_COUNT_V1: MetricDefinition = {
  id: 'review.given_count.v1',
  name: 'Reviews given',
  description:
    'Count of code reviews submitted by the tenant within the selected window.',
  entity: 'review',
  unit: 'count',
  display: {
    label: 'Reviews given',
    description: 'Reviews you submitted in this period',
    valueFormat: {
      scale: 1,
      unitSuffix: ``,
      decimals: 0,
      kind: 'count',
    },
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

export const REVIEWS_COMMENT_AVG_V1: MetricDefinition = {
  id: 'review.comment_count.avg.v1',
  name: 'Comments per review',
  description: 'Average comments per review by the tenant',
  entity: 'review',
  unit: 'count',
  display: {
    label: 'Comments per review',
    description: 'Average comments per review by the tenant',
    valueFormat: {
      scale: 1,
      unitSuffix: ``,
      decimals: 1,
      kind: 'count',
    },
  },
  cacheTtlSeconds: 300,
  formula: {
    kind: 'plan',
    source: 'reviews',
    operation: 'avg',
    column: 'reviewCommentsCount',
    timeColumn: 'submittedAt',
    where: [
      { col: 'reviewerIsTenant', op: 'eq', val: true },
      { col: 'submittedAt', op: 'between', startRef: 'start', endRef: 'end' },
    ],
  },
};

export const REVIEW_LATENCY_SECONDS_AVG_V1: MetricDefinition = {
  id: 'review.latency_seconds.avg.v1',
  name: 'Avg review latency (seconds)',
  description:
    'Average time from the relevant request/anchor to the reviewer’s submission, for reviews made by the tenant within the window.',
  entity: 'review',
  unit: 'hours',
  display: {
    label: 'Your review response time',
    description:
      'How long it takes you to respond when someone else requests your review',
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
  display: {
    label: 'First responder',
    description: 'You were the first to review',
    valueFormat: {
      scale: 1,
      unitSuffix: 'reviews',
      decimals: 0,
      kind: 'count',
    },
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
  display: {
    label: 'Substantive reviews',
    description: 'Reviews with code comments',
    valueFormat: {
      scale: 1,
      unitSuffix: 'reviews',
      decimals: 0,
      kind: 'count',
    },
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
  display: {
    label: 'Substantive reviews',
    description: 'Share of your reviews that had code comments',
    valueFormat: {
      scale: 1,
      unitSuffix: '%',
      decimals: 1,
      kind: 'ratio',
    },
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
