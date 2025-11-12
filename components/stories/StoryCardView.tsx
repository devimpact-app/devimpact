"use client";

import { formatSeconds } from "@/lib/utils/date";
import * as React from "react";

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

function formatRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  const ySame = start.getFullYear() === end.getFullYear();
  const y = (d: Date) =>
    new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(d);
  return ySame
    ? `${fmt.format(start)}–${fmt.format(end)}, ${y(end)}`
    : `${fmt.format(start)} ${y(start)}–${fmt.format(end)} ${y(end)}`;
}

export function StoryCardView({ story }: { story: StoryCard }) {
  return (
    <article className="rounded-2xl border border-border bg-surface-alt p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeColor(story.severity)}`}
            >
              {intentLabel(story.intent)}
            </span>
            <span className="text-xs text-text-secondary">
              {formatRange(
                new Date(story.period.start),
                new Date(story.period.end),
              )}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">
            {story.title}
          </h3>
        </div>
        <span className="text-xs text-text-tertiary">
          Generated{" "}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(story.generatedAt))}
        </span>
      </header>

      <p className="mt-3 text-sm text-text-secondary leading-6">
        {story.summary}
      </p>

      {story.kpis?.length ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {story.kpis.map((kpi, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-background/60 p-4"
            >
              <dt className="text-xs text-text-tertiary">{kpi.label}</dt>
              <dd className="mt-1 text-xl font-semibold">
                {kpi.unit === "s"
                  ? formatSeconds(kpi.value as number)
                  : kpi.value}
                {kpi.unit && kpi.unit !== "s" ? (
                  <span className="ml-1 text-sm text-text-secondary">
                    {kpi.unit}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {story.evidence?.length ? (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">
            Evidence
          </h4>
          <ul className="text-sm text-text-secondary grid gap-1">
            {story.evidence.map((e, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span className="truncate">{e.label ?? e.metricId}</span>
                <span className="font-medium text-text-primary">{e.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
