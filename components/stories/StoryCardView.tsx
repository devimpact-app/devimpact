"use client";

import { formatRange, formatSeconds } from "@/lib/utils/date";
import { useState } from "react";

export type StoryId = "invisible_load.v1";
export type StorySeverity = "info" | "notable" | "strong";
export type StoryIntent = "recognition" | "insight" | "suggestion";

export type StoryCard = {
  id: StoryId;
  tenantId: string;
  period: { start: Date; end: Date };
  title: string;
  summary: string;
  severity: StorySeverity;
  intent: StoryIntent;
  kpis: Array<{ label: string; value: number | string; unit?: string }>;
  evidence: Array<{ metricId: string; value: number; label?: string }>;
  links?: Array<{ label: string; href: string }>;
  generatedAt: Date;

  suggestions?: string[];
};

function badgeColor(severity: StorySeverity) {
  switch (severity) {
    case "strong":
      return "bg-red-100 text-red-900 border-red-200";
    case "notable":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-blue-100 text-blue-900 border-blue-200";
  }
}

function intentLabel(intent: StoryIntent) {
  switch (intent) {
    case "recognition":
      return "Recognition";
    case "insight":
      return "Insight";
    case "suggestion":
      return "Suggestion";
  }
}

function formatEvidenceValue(metricId: string, value: number): string {
  if (Number.isNaN(value)) return "—";

  // Latency / seconds → human time
  if (metricId.includes("seconds") || metricId.includes("latency")) {
    return formatSeconds(value);
  }

  // Percent-like (0–1 or already 0–100 with decimals)
  if (metricId.includes("rate") || metricId.includes("ratio")) {
    if (value <= 1) {
      return `${(value * 100).toFixed(0)}%`;
    }
    return `${value.toFixed(0)}%`;
  }

  // Plain count
  if (Number.isInteger(value)) {
    return value.toString();
  }

  // Fallback: 1 decimal max
  return value.toFixed(1);
}

export function StoryCardView({ story }: { story: StoryCard }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const hasSuggestions = story.suggestions && story.suggestions.length > 0;
  const hasEvidence = story.evidence && story.evidence.length > 0;

  return (
    <article className="rounded-2xl border border-border bg-surface-alt p-5 shadow-sm flex flex-col h-full">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeColor(
              story.severity,
            )}`}
          >
            {intentLabel(story.intent)}
          </span>

          <span className="text-xs text-text-secondary whitespace-nowrap">
            {formatRange(
              new Date(story.period.start),
              new Date(story.period.end),
            )}
          </span>
        </div>

        <h3 className="mt-1 text-lg font-semibold tracking-tight">
          {story.title}
        </h3>
      </header>

      <p className="mt-3 text-sm text-text-secondary leading-6">
        {story.summary}
      </p>

      {story.kpis?.length ? (
        <div className="mt-3 mb-4 flex flex-wrap gap-2">
          {story.kpis.map((kpi, i) => (
            <div
              key={i}
              className="inline-flex items-baseline gap-1 rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1"
            >
              <span className="text-[11px] text-text-tertiary">
                {kpi.label}
              </span>
              <span className="text-sm font-medium tabular-nums text-text-primary">
                {kpi.unit === "s"
                  ? formatSeconds(kpi.value as number)
                  : kpi.value}
                {kpi.unit && kpi.unit !== "s" ? (
                  <span className="ml-1 text-sm text-text-secondary">
                    {kpi.unit}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {(hasSuggestions || hasEvidence) && (
        <div className="mt-auto pt-4 border-t border-text-secondary space-y-2">
          {hasSuggestions && (
            <div>
              <button
                type="button"
                onClick={() => setShowSuggestions((prev) => !prev)}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-tertiary"
              >
                <span>Optional Suggestions ({story.suggestions?.length})</span>
                <span className="text-[10px] font-medium text-text-secondary">
                  {showSuggestions ? "Hide" : "Show"}
                </span>
              </button>

              {showSuggestions && (
                <ul className="mt-1.5 space-y-1.5 text-xs leading-snug text-text-secondary">
                  {story.suggestions!.map((text, i) => (
                    <li key={i}>• {text}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {hasEvidence && (
            <div>
              <button
                type="button"
                onClick={() => setShowEvidence((prev) => !prev)}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-tertiary"
              >
                <span>Evidence ({story.evidence.length})</span>
                <span className="text-[10px] font-medium text-text-secondary">
                  {showEvidence ? "Hide" : "Show"}
                </span>
              </button>

              {showEvidence && (
                <ul className="mt-1.5 grid gap-1.5 text-xs text-text-secondary">
                  {story.evidence.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="truncate font-mono text-[11px] text-text-tertiary">
                        {e.label ?? e.metricId}
                      </span>
                      <span className="ml-3 shrink-0 font-medium tabular-nums text-text-primary">
                        {formatEvidenceValue(e.metricId, e.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {story.links?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {story.links.map((l, i) => (
            <a
              key={i}
              href={l.href}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background transition"
            >
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function StoryCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface-alt p-5">
      <div className="h-4 w-24 rounded bg-gray-300/40" />
      <div className="mt-2 h-6 w-64 rounded bg-gray-300/40" />
      <div className="mt-4 h-4 w-full rounded bg-gray-300/30" />
      <div className="mt-2 h-4 w-11/12 rounded bg-gray-300/30" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-16 rounded-xl border border-border bg-gray-300/20" />
        <div className="h-16 rounded-xl border border-border bg-gray-300/20" />
      </div>
    </div>
  );
}
