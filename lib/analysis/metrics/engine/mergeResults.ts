import {
  MetricResult,
  StatResult,
  TimeseriesResult,
  Series,
  StatDataset,
} from "../types/output";

type MergeOptions = {
  // When true, for timeseries we align on timestamps and drop points
  // that exist in only one side. Default: false (let the chart render both as-is).
  alignTimeseries?: boolean;
};

export function mergePrimaryAndComparison(
  primary: MetricResult,
  comparison?: MetricResult | null,
  opts: MergeOptions = {},
): MetricResult {
  if (!comparison) return primary;

  // Guard: must be the same shape & metricId to merge meaningfully
  if (
    primary.shape !== comparison.shape ||
    primary.metricId !== comparison.metricId
  ) {
    // Fallback: ignore comparison if shapes/ids mismatch
    return primary;
  }

  if (primary.shape === "stat") {
    return mergeStat(primary as StatResult, comparison as StatResult);
  }

  // timeseries
  return mergeTimeseries(
    primary as TimeseriesResult,
    comparison as TimeseriesResult,
    opts,
  );
}

function mergeStat(primary: StatResult, comparison: StatResult): StatResult {
  const cur = valueOf(primary);
  const cmp = valueOf(comparison);

  const deltaAbs =
    cur.value != null && cmp.value != null ? cur.value - cmp.value : null;

  const deltaPct =
    cur.value != null && cmp.value != null && cmp.value !== 0
      ? (cur.value - cmp.value) / Math.abs(cmp.value)
      : null;

  const data: StatDataset[] = [
    { kind: "current", value: cur.value, deltaAbs, deltaPct },
    { kind: "comparison", value: cmp.value },
  ];

  return {
    ...primary,
    // keep primary’s title/unit/meta; you can also add comparison meta if useful
    data,
  };
}

function valueOf(s: StatResult): { value: number | null } {
  // Expect one dataset in simple runners; otherwise pick the first "current"
  const current = s.data.find((d) => d.kind === "current") ??
    s.data[0] ?? { value: null };
  return { value: current.value ?? null };
}

function mergeTimeseries(
  primary: TimeseriesResult,
  comparison: TimeseriesResult,
  opts: MergeOptions,
): TimeseriesResult {
  // Default: return two labeled series, untouched
  if (!opts.alignTimeseries) {
    return {
      ...primary,
      series: [
        labelSeries(primary.series, "Current"),
        labelSeries(comparison.series, "Comparison"),
      ].flat(),
    };
  }

  // Alignment path: build point maps for each label and intersect timestamps
  const aligned: Series[] = [];
  const primLabeled = labelSeries(primary.series, "Current");
  const compLabeled = labelSeries(comparison.series, "Comparison");

  // We’ll align per-series label index, assuming both sets have same number of series
  const maxSeries = Math.max(primLabeled.length, compLabeled.length);
  for (let i = 0; i < maxSeries; i++) {
    const p = primLabeled[i];
    const c = compLabeled[i];

    if (!p || !c) {
      // If shapes differ (e.g., aggregation changes), just push available series
      if (p) aligned.push(p);
      if (c) aligned.push(c);
      continue;
    }

    const pMap = new Map(p.points.map((pt) => [pt.t, pt.v]));
    const cMap = new Map(c.points.map((pt) => [pt.t, pt.v]));

    // Intersect timestamps
    const ts = intersectTimestamps(pMap, cMap);

    const pAligned = {
      label: p.label,
      points: ts.map((t) => ({ t, v: (pMap.get(t) ?? null) as number | null })),
    };

    const cAligned = {
      label: c.label,
      points: ts.map((t) => ({ t, v: (cMap.get(t) ?? null) as number | null })),
    };

    aligned.push(pAligned, cAligned);
  }

  return { ...primary, series: aligned };
}

function labelSeries(series: Series[], suffix: string): Series[] {
  // Only add suffix if not already labeled
  return series.map((s) => ({
    label: s.label?.includes(suffix)
      ? s.label
      : `${s.label || ""}`.trim() || suffix,
    points: s.points,
  }));
}

function intersectTimestamps(
  a: Map<string, number | null>,
  b: Map<string, number | null>,
): string[] {
  const out: string[] = [];
  for (const t of a.keys()) if (b.has(t)) out.push(t);
  // Keep natural sort (ISO ascending) if your buckets are built in order
  out.sort();
  return out;
}
