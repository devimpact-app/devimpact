import { MetricDefinition } from "../types/definition";
import {
  AUTHORED_PRS_COUNT_V1,
  PR_LEAD_TIME_SECONDS_V1,
  PR_SIZE_LINES_CHANGED_MEDIAN_V1,
} from "./pullRequests";
import {
  REVIEW_FIRST_RESPONDER_COUNT_V1,
  REVIEW_LATENCY_SECONDS_AVG_V1,
  REVIEW_SUBSTANTIVE_COUNT_V1,
  REVIEWS_GIVEN_COUNT_V1,
  REVIEW_SUBSTANTIVE_RATE_V1,
} from "./reviews";

export const ALL_METRICS: MetricDefinition[] = [
  PR_LEAD_TIME_SECONDS_V1,
  AUTHORED_PRS_COUNT_V1,
  PR_SIZE_LINES_CHANGED_MEDIAN_V1,
  REVIEWS_GIVEN_COUNT_V1,
  REVIEW_LATENCY_SECONDS_AVG_V1,
  REVIEW_FIRST_RESPONDER_COUNT_V1,
  REVIEW_SUBSTANTIVE_COUNT_V1,
  REVIEW_SUBSTANTIVE_RATE_V1,
];

export type MetricId = (typeof ALL_METRICS)[number]["id"];

export const METRIC_CATALOG_MAP: Record<string, MetricDefinition> =
  Object.fromEntries(ALL_METRICS.map((m) => [m.id, m]));
