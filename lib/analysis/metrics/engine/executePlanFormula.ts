import { and, between, eq, gt, gte, inArray, lt, lte, sql } from "drizzle-orm";
import type { MetricDefinition } from "../types/definition";
import { MetricInput } from "../types/input";
import { DB } from "@/lib/db/client";
import { pullRequests, reviews } from "@/lib/db/schema";
import { TMetricResult } from "@/types/api/metrics";

export const TABLES = {
  pullRequests,
  reviews,
};
export type TableId = keyof typeof TABLES;

function resolveTable(tableId: TableId) {
  const table = TABLES[tableId];
  if (!table) throw new Error(`Unknown table: ${tableId}`);
  return table;
}

function andAll(...clauses: any[]) {
  const present = clauses.filter(Boolean);
  return present.length ? and(...present) : undefined;
}

function buildWhereClauses(
  table: any,
  where: NonNullable<
    Extract<MetricDefinition["formula"], { kind: "plan" }>["where"]
  >,
  input: MetricInput,
) {
  const clauses: any[] = [];

  for (const w of where) {
    const colRef = table[w.col as keyof typeof table];
    if (!colRef) throw new Error(`Unknown column '${w.col}'`);

    switch (w.op) {
      case "eq":
        clauses.push(eq(colRef, w.val));
        break;
      case "neq":
        clauses.push(sql`${colRef} != ${w.val}`);
        break;
      case "gt":
        clauses.push(gt(colRef, w.val));
        break;
      case "gte":
        clauses.push(gte(colRef, w.val));
        break;
      case "lt":
        clauses.push(lt(colRef, w.val));
        break;
      case "lte":
        clauses.push(lte(colRef, w.val));
        break;
      case "between": {
        const start =
          w.start ?? (w.startRef === "start" ? new Date(input.start) : w.start);
        const end = w.end ?? (w.endRef === "end" ? new Date(input.end) : w.end);
        if (start == null || end == null)
          throw new Error("between requires start/end");
        clauses.push(between(colRef, start, end));
        break;
      }
      case "in": {
        const vals = w.vals ?? [];
        clauses.push(inArray(colRef, vals));
        break;
      }
      case "is_null":
        clauses.push(sql`${colRef} IS NULL`);
        break;
      case "is_not_null":
        clauses.push(sql`${colRef} IS NOT NULL`);
        break;
      default:
        throw new Error(`Unsupported where op: ${(w as any).op}`);
    }
  }

  return clauses.length ? and(...clauses) : undefined;
}

export async function executePlanFormula(
  def: MetricDefinition,
  input: MetricInput,
  ctx: { db: DB },
): Promise<TMetricResult> {
  if (input.shape !== "stat" || def.formula.kind !== "plan") {
    throw new Error("Plan executor currently supports only 'stat' shape");
  }

  const plan = def.formula;
  const table = resolveTable(plan.source as TableId);

  const userWhere = plan.where
    ? buildWhereClauses(table, plan.where, input)
    : undefined;

  const tenantWhere =
    "tenantId" in table
      ? eq((table as any).tenantId, input.tenantId)
      : undefined;

  const where = andAll(tenantWhere, userWhere);

  let selectExpr: any;
  if (plan.operation === "count") {
    selectExpr = { value: sql<number>`count(*)::int` };
  } else if (plan.operation === "avg") {
    if (!plan.column) throw new Error("avg requires 'column'");
    const col = table[plan.column as keyof typeof table];
    selectExpr = { value: sql<number>`avg(${col})::float` };
  } else if (plan.operation === "sum") {
    if (!plan.column) throw new Error("sum requires 'column'");
    const col = table[plan.column as keyof typeof table];
    selectExpr = { value: sql<number>`sum(${col})::float` };
  } else {
    throw new Error(`Unsupported operation: ${plan.operation}`);
  }

  const query = ctx.db
    .select(selectExpr)
    .from(table)
    .where(where as any);
  const debug = query.toSQL();
  console.log("SQL:", debug.sql);
  const rows = await query;
  const value = rows[0]?.value ?? null;

  return {
    metricId: def.id,
    shape: "stat",
    title: def.display?.label ?? def.name,
    unit: def.unit,
    window: {
      start: input.start.toISOString(),
      end: input.end.toISOString(),
    },
    data: [{ kind: "current", value: value === null ? null : Number(value) }],
  };
}
