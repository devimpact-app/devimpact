import {
  TMetricInput,
  TMetricResult,
  TMetricsBatchInput,
  TMetricsBatchResult,
  TStatResult,
} from "@/types/api/metrics";
import { runMetric } from "./engine/runMetric";
import { db } from "@/lib/db/client";
import { METRIC_CATALOG_MAP } from "./catalog";
import { toDate } from "@/lib/utils/date";
import { StatDataset, StatResult } from "./types/output";

type MetricInputForBatch = TMetricsBatchInput["requests"][0];

function makeInputKey(input: MetricInputForBatch): string {
  return [input.metricId, input.input.start, input.input.end].join("|");
}

function sameContext(a: TMetricInput, b: TMetricInput): boolean {
  return (
    makeInputKey({ input: a, metricId: "" }) ===
    makeInputKey({ input: b, metricId: "" })
  );
}

function expandInputsWithDependencies(
  inputs: TMetricsBatchInput["requests"],
): TMetricsBatchInput["requests"] {
  const expanded = [...inputs];
  const existingKeys = new Set(expanded.map(makeInputKey));

  for (const input of inputs) {
    const def = METRIC_CATALOG_MAP[input.metricId];
    if (!def) continue;

    if (def.formula.kind === "derived") {
      for (const depId of def.formula.dependsOn) {
        const depInput = {
          ...input,
          metricId: depId,
        };
        const key = makeInputKey(depInput);
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          expanded.push(depInput);
        }
      }
    }
  }

  return expanded;
}

export async function runBatchServer(
  input: TMetricsBatchInput,
  tenantId: string,
): Promise<TMetricsBatchResult> {
  const inputs = expandInputsWithDependencies(input.requests);
  const requestedKeys = new Set(input.requests.map(makeInputKey));

  const planInputs: MetricInputForBatch[] = [];
  const derivedInputs: MetricInputForBatch[] = [];

  for (const input of inputs) {
    const def = METRIC_CATALOG_MAP[input.metricId];
    if (!def) {
      console.warn(`Unknown metricId: ${input.metricId}`);
      continue;
    }

    if (def.formula.kind === "plan") {
      planInputs.push(input);
    } else {
      derivedInputs.push(input);
    }
  }

  // Run non-derived metrics
  const planResults: TMetricResult[] = [];
  const resultByKey = new Map<string, TMetricResult>();
  for (const r of planInputs) {
    const def = METRIC_CATALOG_MAP[r.metricId];
    const start = toDate(r.input.start);
    const end = toDate(r.input.end);
    if (!start || !end || start > end) {
      // Push invalid date error if bad range
      planResults.push({
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

    planResults.push(result);
    resultByKey.set(makeInputKey(r), result);
  }

  const derivedResults: TMetricResult[] = [];

  for (const input of derivedInputs) {
    const def = METRIC_CATALOG_MAP[input.metricId]!;
    const formula = def.formula;

    if (formula.kind !== "derived") continue;

    if (formula.compute === "ratio") {
      const numeratorKey = makeInputKey({
        ...input,
        metricId: formula.numerator,
      });
      const denominatorKey = makeInputKey({
        ...input,
        metricId: formula.denominator,
      });

      const numRes = resultByKey.get(numeratorKey);
      const denRes = resultByKey.get(denominatorKey);

      if (!numRes || !denRes) {
        console.warn("Missing dependency result for derived metric", def.id);
        continue;
      }

      if (numRes.shape !== "stat" || denRes.shape !== "stat") {
        throw new Error(
          `Derived ratio metrics only supported for 'stat' shapes (metric: ${def.id})`,
        );
      }

      const numStat = numRes as StatResult;
      const denStat = denRes as StatResult;

      // Build datasets aligned by kind: "current", "comparison", etc.
      const datasets: StatDataset[] = numStat.data.map((numDataset) => {
        const matchingDen = denStat.data.find(
          (d) => d.kind === numDataset.kind,
        );

        const numVal = numDataset.value;
        const denVal = matchingDen?.value ?? null;

        let v: number | null = null;
        if (numVal != null && denVal != null && denVal !== 0) {
          v = numVal / denVal;
        }

        return {
          kind: numDataset.kind,
          value: v,
          // We'll recompute deltas later below
        };
      });

      // Optionally compute deltaAbs / deltaPct when both current + comparison exist
      const current = datasets.find((d) => d.kind === "current");
      const comparison = datasets.find((d) => d.kind === "comparison");
      if (
        current &&
        comparison &&
        current.value != null &&
        comparison.value != null
      ) {
        const cur = current.value;
        const cmp = comparison.value;

        current.deltaAbs = cur - cmp;
        current.deltaPct = cmp === 0 ? null : (cur - cmp) / Math.abs(cmp);
      }

      const derivedStatResult: TStatResult = {
        metricId: def.id,
        shape: "stat",
        data: datasets,
        window: {
          start: input.input.start,
          end: input.input.end,
        },
      };

      derivedResults.push(derivedStatResult);
      resultByKey.set(makeInputKey(input), derivedStatResult);
    } else {
      throw new Error(`Unsupported derived compute`);
    }
  }
  const allResults = [...planResults, ...derivedResults];
  return {
    results: allResults.filter((r) => {
      const key = makeInputKey({
        metricId: r.metricId,
        input: {
          ...r.window,
        } as TMetricInput,
      });
      return requestedKeys.has(key);
    }),
  };
}
