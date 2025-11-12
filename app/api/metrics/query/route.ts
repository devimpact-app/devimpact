import { auth } from "@/lib/auth";
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from "../../_lib/http";
import {
  MetricsBatchInput,
  MetricsBatchResult,
  TMetricResult,
  TMetricsBatchInput,
} from "@/types/api/metrics";
import { METRIC_CATALOG_MAP } from "@/lib/analysis/metrics/catalog";
import { MetricId } from "@/lib/analysis/metrics/types/definition";
import { toDate } from "@/lib/utils/date";
import { runMetric } from "@/lib/analysis/metrics/engine/runMetric";
import { db } from "@/lib/db/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonUnauthorized();
    }
    const tenantId = session.user.id;

    // Parse input
    const json = await req.json();
    const parse = MetricsBatchInput.safeParse(json);
    if (!parse.success) {
      return jsonBadRequest("Invalid input shape");
    }
    const body: TMetricsBatchInput = parse.data;

    const catalogMap = METRIC_CATALOG_MAP;

    const results: TMetricResult[] = [];
    for (const r of body.requests) {
      const def = catalogMap[r.metricId as MetricId];
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

    const out = MetricsBatchResult.parse({ results });
    return jsonOK(out);
  } catch (err) {
    console.error("/api/metrics/query error", err);
    return jsonServerError("Internal error");
  }
}
