import { TMetricResult } from "@/types/api/metrics";
import { MetricDefinition } from "../types/definition";
import { MetricContext, MetricInput } from "../types/input";
import { MetricResult } from "../types/output";
import { executePlanFormula } from "./executePlanFormula";

export async function executeMetric(
  def: MetricDefinition,
  input: MetricInput,
  ctx: MetricContext,
): Promise<TMetricResult> {
  switch (def.formula.kind) {
    case "plan":
      return executePlanFormula(def, input, ctx);
    case "sql":
      // return executeSqlFormula(def, input, ctx);
      throw new Error("SQL formulas not implemented yet");
    case "function":
      // return executeFunctionFormula(def, input, ctx);
      throw new Error("Function formulas not implemented yet");
    default:
      throw new Error(`Unknown formula kind: ${(def as any).formula?.kind}`);
  }
}
