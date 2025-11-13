"use client";

type MetricStatCardProps = {
  title: string; // e.g. "Avg PR lead time"
  periodLabel?: string; // e.g. "Last 30 days"
  value: string | number | null | undefined; // already formatted ("3d 19h", "1h", "28")
  loading?: boolean;

  // Optional comparison
  comparisonLabel?: string; // e.g. "Last period"
  comparisonValue?: string | number | null;
  // Optional little delta text (already formatted, e.g. "+12h", "-8%")
  deltaText?: string | null;
  deltaTone?: "better" | "worse" | "neutral";

  description?: string; // tiny caption
  className?: string;
};

function formatStatValue(
  value: number | null | undefined,
  isPercent?: boolean,
  decimals = 0,
) {
  if (!value) return "—";

  if (isPercent) {
    const pct = value * 100;
    return `${pct.toFixed(decimals)}%`;
  }

  return value.toFixed(decimals);
}

export function MetricStatCard({
  title,
  periodLabel,
  value,
  loading,
  comparisonLabel,
  comparisonValue,
  deltaText,
  deltaTone = "neutral",
  description,
  className,
}: MetricStatCardProps) {
  const showComparison = comparisonLabel && comparisonValue !== undefined;

  const deltaColor =
    deltaTone === "better"
      ? "text-emerald-400"
      : deltaTone === "worse"
        ? "text-rose-400"
        : "text-text-secondary";

  const isPercent =
    title.toLowerCase().includes("rate") ||
    title.toLowerCase().includes("ratio");

  const displayValue =
    typeof value === "string" ? value : formatStatValue(value, isPercent, 0);
  const comparisonDisplayValue =
    typeof comparisonValue === "string"
      ? value
      : formatStatValue(comparisonValue, isPercent, 0);

  return (
    <section className="rounded-xl border border-border bg-surface-alt/80 px-4 py-3 flex flex-col gap-1.5 min-w-[220px]">
      {/* Title + period */}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary/80">
          {title}
        </h3>
        {periodLabel && (
          <span className="text-[10px] text-text-secondary/70">
            {periodLabel}
          </span>
        )}
      </div>

      {/* Main value */}
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold tabular-nums">
          {loading ? "…" : (displayValue ?? "—")}
        </div>
        {deltaText && (
          <span className="text-[11px] rounded-full px-2 py-[2px] bg-background/60 border border-border/60">
            {deltaText}
          </span>
        )}
      </div>

      {/* Comparison row */}
      {showComparison && (
        <div className="text-xs text-text-secondary">
          <span className="font-medium">{comparisonLabel}:</span>{" "}
          {loading ? "…" : (comparisonDisplayValue ?? "—")}
        </div>
      )}

      {/* Tiny caption */}
      {description && (
        <p className="mt-0.5 text-[11px] leading-snug text-text-secondary/80">
          {description}
        </p>
      )}
    </section>
  );
}
