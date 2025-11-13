"use client";

import {
  GitPullRequest,
  GitMerge,
  MessageSquare,
  FolderKanban,
  ArrowRight,
} from "lucide-react";

type ThemeSummary = {
  title: string; // e.g. "PRs you touched"
  metricLabel: string; // e.g. "Merged"
  metricValue: string; // e.g. "5 PRs"
  description: string; // short 1-line micro-summary
};

type HighlightItem = {
  id: string;
  kind: "pr_merged" | "pr_opened" | "review" | "other";
  title: string; // e.g. "Improve dashboard layout"
  meta?: string; // e.g. "Merged • 184 lines"
};

type RecentActivitySummaryCardProps = {
  periodLabel: string; // e.g. "Last 14 days"
  summary: string; // main narrative paragraph
  prSummary?: ThemeSummary;
  reviewSummary?: ThemeSummary;
  projectSummary?: ThemeSummary;
  highlights?: HighlightItem[];
};

function highlightIcon(kind: HighlightItem["kind"]) {
  switch (kind) {
    case "pr_merged":
      return <GitMerge className="h-3.5 w-3.5 text-slate-400" />;
    case "pr_opened":
      return <GitPullRequest className="h-3.5 w-3.5 text-slate-400" />;
    case "review":
      return <MessageSquare className="h-3.5 w-3.5 text-slate-400" />;
    default:
      return <FolderKanban className="h-3.5 w-3.5 text-slate-400" />;
  }
}

export function RecentActivitySummaryCard({
  periodLabel,
  summary,
  prSummary,
  reviewSummary,
  projectSummary,
  highlights = [],
}: RecentActivitySummaryCardProps) {
  return (
    <section className="mt-8">
      {/* Section header */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-primary">
          Recent Activity
        </h2>
        <span className="text-xs text-text-secondary">{periodLabel}</span>
      </div>

      {/* Main card */}
      <article className="rounded-2xl border border-border bg-surface-alt px-5 py-4 shadow-sm flex flex-col gap-4">
        {/* AI-style narrative summary */}
        <p className="text-sm leading-6 text-text-secondary max-w-3xl">
          {summary}
        </p>

        {/* Thematic strips: PRs / Reviews / Projects */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {prSummary && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-3.5 w-3.5 text-slate-300" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {prSummary.title}
                </h3>
              </div>
              <div className="text-sm font-semibold tabular-nums text-text-primary">
                {prSummary.metricValue}
                <span className="ml-1 text-xs font-normal text-text-secondary">
                  {prSummary.metricLabel}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                {prSummary.description}
              </p>
            </div>
          )}

          {reviewSummary && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-slate-300" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {reviewSummary.title}
                </h3>
              </div>
              <div className="text-sm font-semibold tabular-nums text-text-primary">
                {reviewSummary.metricValue}
                <span className="ml-1 text-xs font-normal text-text-secondary">
                  {reviewSummary.metricLabel}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                {reviewSummary.description}
              </p>
            </div>
          )}

          {projectSummary && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-3.5 w-3.5 text-slate-300" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {projectSummary.title}
                </h3>
              </div>
              <div className="text-sm font-semibold tabular-nums text-text-primary">
                {projectSummary.metricValue}
                <span className="ml-1 text-xs font-normal text-text-secondary">
                  {projectSummary.metricLabel}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                {projectSummary.description}
              </p>
            </div>
          )}
        </div>

        {/* Highlights + timeline link */}
        <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="md:max-w-xl">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
              Highlights
            </h4>
            {highlights.length === 0 ? (
              <p className="text-xs text-text-secondary">
                We’ll surface a few representative PRs and reviews here.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs text-text-secondary">
                {highlights.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-1"
                  >
                    <span className="mt-[2px]">{highlightIcon(item.kind)}</span>
                    <div>
                      <div className="text-xs font-medium text-text-primary">
                        {item.title}
                      </div>
                      {item.meta && (
                        <div className="text-[11px] text-text-secondary">
                          {item.meta}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
          >
            View full timeline
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>
    </section>
  );
}
