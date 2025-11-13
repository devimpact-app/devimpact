"use client";

import { MetricsAPI } from "@/lib/analysis/metrics/client";
import { useEffect, useMemo, useState } from "react";
import { StatResult } from "@/lib/analysis/metrics/types/output";
import { formatSeconds } from "@/lib/utils/date";
import {
  StoryCardSkeleton,
  StoryCardView,
} from "@/components/stories/StoryCardView";
import { DashboardHero } from "./components/Hero";
import { MetricStatCard } from "./components/MetricStatCard";

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function DashboardClient({ user }: Props) {
  const [catalog, setCatalog] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [leadTimeStat, setLeadTimeStat] = useState<StatResult | null>(null);
  const [reviewLatencyStat, setReviewLatencyStat] = useState<StatResult | null>(
    null,
  );
  const [linesChangedStat, setLinesChangedStat] = useState<StatResult | null>(
    null,
  );
  const [substantiveReviewStat, setSubstantiveReviewStat] =
    useState<StatResult | null>(null);

  const [story, setStory] = useState<any | null>(null);

  const { startISO, endISO } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, []);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await MetricsAPI.getCatalog();
        setCatalog(data.metrics);
      } catch (err) {
        setError("Failed to load metrics catalog");
      }
    }

    loadCatalog();

    async function loadStory() {
      const res = await fetch(`/api/stories/invisible-load`);
      const { data } = await res.json();
      setStory(data);
    }
    loadStory();
  }, []);

  useEffect(() => {
    if (!catalog) return;
    (async () => {
      try {
        setLoadingMetrics(true);

        const batch = await MetricsAPI.runBatch({
          requests: [
            {
              metricId: "pr.lead_time_seconds.v1",
              input: {
                start: startISO,
                end: endISO,
                shape: "stat",
                comparison: { kind: "previous_period" },
              },
            },
            {
              metricId: "review.latency_seconds.avg.v1",
              input: {
                start: startISO,
                end: endISO,
                shape: "stat",
                comparison: { kind: "previous_period" },
              },
            },
            {
              metricId: "pr.size_lines_changed_median.v1",
              input: {
                start: startISO,
                end: endISO,
                shape: "stat",
                comparison: { kind: "previous_period" },
              },
            },
            {
              metricId: "review.substantive_rate.v1",
              input: {
                start: startISO,
                end: endISO,
                shape: "stat",
                comparison: { kind: "previous_period" },
              },
            },
          ],
        });

        const lead = batch.results.find(
          (r) => r.metricId === "pr.lead_time_seconds.v1" && r.shape === "stat",
        ) as StatResult | undefined;
        setLeadTimeStat(lead ?? null);
        const latency = batch.results.find(
          (r) =>
            r.metricId === "review.latency_seconds.avg.v1" &&
            r.shape === "stat",
        ) as StatResult | undefined;
        setReviewLatencyStat(latency ?? null);
        const linesChanged = batch.results.find(
          (r) =>
            r.metricId === "pr.size_lines_changed_median.v1" &&
            r.shape === "stat",
        ) as StatResult | undefined;
        setLinesChangedStat(linesChanged ?? null);
        const substantiveReviewRate = batch.results.find(
          (r) =>
            r.metricId === "review.substantive_rate.v1" && r.shape === "stat",
        ) as StatResult | undefined;
        setSubstantiveReviewStat(substantiveReviewRate ?? null);
      } catch {
        setError("Failed to load metrics");
      } finally {
        setLoadingMetrics(false);
      }
    })();
  }, [catalog, startISO, endISO]);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!catalog) return <div>Loading metrics…</div>;

  const leadValue =
    leadTimeStat?.data?.find((d) => d.kind === "current")?.value ?? null;
  const comparisonValue =
    leadTimeStat?.data?.find((d) => d.kind === "comparison")?.value ?? null;
  const latencyValue =
    reviewLatencyStat?.data?.find((d) => d.kind === "current")?.value ?? null;
  const latencyComparisonValue =
    reviewLatencyStat?.data?.find((d) => d.kind === "comparison")?.value ??
    null;

  const linesValue =
    linesChangedStat?.data?.find((d) => d.kind === "current")?.value ?? null;
  const linesComparisonValue =
    linesChangedStat?.data?.find((d) => d.kind === "comparison")?.value ?? null;
  const subValue =
    substantiveReviewStat?.data?.find((d) => d.kind === "current")?.value ??
    null;
  const subComparisonValue =
    substantiveReviewStat?.data?.find((d) => d.kind === "comparison")?.value ??
    null;

  console.log("story", story);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <DashboardHero
          userName={user.name}
          range="30d"
          periodLabel="Oct 13 - Nov 12, 2025"
        />

        <div>
          <h2 className="text-lg font-semibold mb-4">Current Pulse</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricStatCard
              title="Avg Review Latency"
              periodLabel="Last 30 days"
              value={loadingMetrics ? null : formatSeconds(latencyValue)}
              comparisonLabel="Last period"
              comparisonValue={
                loadingMetrics ? null : formatSeconds(latencyComparisonValue)
              }
              // deltaText={deltaDisplay}
              // deltaTone={deltaIsGood ? "better" : "worse"}
              description="Average time to respond to others’ PRs"
            />
            <MetricStatCard
              title="Avg PR lead time"
              periodLabel="Last 30 days"
              value={loadingMetrics ? null : formatSeconds(leadValue)}
              comparisonLabel="Last period"
              comparisonValue={
                loadingMetrics ? null : formatSeconds(comparisonValue)
              }
              description="First commit → merge (merged PRs only)."
            />
            <MetricStatCard
              title="Typical PR Size"
              periodLabel="Last 30 days"
              value={
                loadingMetrics ? null : `${Math.round(linesValue || 0)} lines`
              }
              comparisonLabel="Last period"
              comparisonValue={
                loadingMetrics
                  ? null
                  : `${Math.round(linesComparisonValue || 0)} lines`
              }
              description="Median lines changed per merged PR you authored"
            />
            <MetricStatCard
              title="Substantive Review ratio"
              periodLabel="Last 30 days"
              value={loadingMetrics ? null : subValue}
              comparisonLabel="Last period"
              comparisonValue={loadingMetrics ? null : subComparisonValue}
              description="Ratio of reviews you authored where you left comments"
            />
          </div>
        </div>

        {/* Stories section - with header */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Impact</h2>
          <div className="grid grid-cols-3 gap-4">
            {story ? <StoryCardView story={story} /> : <StoryCardSkeleton />}
          </div>
        </div>

        {/* Recent work - with header */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {/* <SummaryCard /> */}
        </div>
      </main>
    </div>
  );
}
