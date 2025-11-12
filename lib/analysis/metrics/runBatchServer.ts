import {
  TMetricInput,
  TMetricResult,
  TMetricsBatchInput,
  TMetricsBatchResult,
} from "@/types/api/metrics";
import { runMetric } from "./engine/runMetric";
import type { MetricsBatchResult } from "./types/output";
import { db } from "@/lib/db/client";
import { METRIC_CATALOG_MAP } from "./catalog";
import { toDate } from "@/lib/utils/date";

export async function runBatchServer(
  input: TMetricsBatchInput,
  tenantId: string,
): Promise<TMetricsBatchResult> {
  const results: TMetricResult[] = [];
  for (const r of input.requests) {
    const def = METRIC_CATALOG_MAP[r.metricId];
    if (!def) {
      // Push error result if non-existant metric
      results.push({
        metricId: r.metricId,
        shape: r.input.shape,
        ...(r.input.shape === "stat"
          ? { data: [{ kind: "current", value: null }] }
          : { series: [] }),
        error: { code: "UNKNOWN_METRIC", message: "Metric not found" },
      } as TMetricResult);
      continue;
    }
    const start = toDate(r.input.start);
    const end = toDate(r.input.end);
    if (!start || !end || start > end) {
      // Push invalid date error if bad range
      results.push({
        metricId: r.metricId,
        shape: r.input.shape,
        ...(r.input.shape === "stat"
          ? { data: [{ kind: "current", value: null }] }
          : { series: [] }),
        error: { code: "INVALID_DATES", message: "Invalid date window" },
      } as TMetricResult);
      continue;
    }

    // Run metric
    const ctx = { db };
    const result = await runMetric(
      def,
      {
        ...r.input,
        tenantId,
        start,
        end,
        comparison:
          r.input.comparison?.kind === "custom"
            ? {
                kind: "custom",
                start: toDate(r.input.comparison.start),
                end: toDate(r.input.comparison.end),
              }
            : r.input.comparison,
      },
      ctx,
    );

    results.push(result);
  }
  return { results };
}
