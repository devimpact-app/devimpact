"use client";

import { MetricsAPI } from "@/lib/analysis/metrics/client";
import { useEffect, useMemo, useState } from "react";
import { StatResult } from "@/lib/analysis/metrics/types/output";
import { formatRange, formatSeconds } from "@/lib/utils/date";
import {
  StoryCardSkeleton,
  StoryCardView,
} from "@/components/stories/StoryCardView";
import { DashboardHero } from "./components/Hero";
import { MetricStatCard } from "./components/MetricStatCard";
import { RecentActivitySummaryCard } from "./components/WeeklyReviewCard";

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

  const [loadingStories, setLoadingStories] = useState(false);

  const [story1, setStory1] = useState<any | null>(null);
  const [story2, setStory2] = useState<any | null>(null);
  const [story3, setStory3] = useState<any | null>(null);

  const { startISO, endISO } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 14);
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

    setLoadingStories(true);
    async function loadStory() {
      const res = await fetch(
        `/api/stories/query?start=${startISO}&end=${endISO}&id=invisible_load.v1&id=productive_windows.v1&id=collaboration_patterns.v1`,
      );
      const { data } = await res.json();
      setStory1(data.stories[0]);
      setStory2(data.stories[1]);
      setStory3(data.stories[2]);
      setLoadingStories(false);
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

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <DashboardHero
        userName={user.name}
        range="14d"
        periodLabel={formatRange(new Date(startISO), new Date(endISO))}
      />

      <div>
        <h2 className="text-lg font-semibold mb-4">Current Pulse</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricStatCard
            title="Your Review Latency"
            periodLabel="Last 14 days"
            value={loadingMetrics ? null : formatSeconds(latencyValue)}
            comparisonLabel="Last period"
            comparisonValue={
              loadingMetrics ? null : formatSeconds(latencyComparisonValue)
            }
            loading={loadingMetrics}
            // deltaText={deltaDisplay}
            // deltaTone={deltaIsGood ? "better" : "worse"}
            description="Average time to respond to others’ PRs"
          />
          <MetricStatCard
            title="Your PR cycle time"
            periodLabel="Last 14 days"
            value={loadingMetrics ? null : formatSeconds(leadValue)}
            comparisonLabel="Last period"
            comparisonValue={
              loadingMetrics ? null : formatSeconds(comparisonValue)
            }
            loading={loadingMetrics}
            description="Average time from first commit → merge"
          />
          <MetricStatCard
            title="Your typical PR Size"
            periodLabel="Last 14 days"
            value={
              loadingMetrics ? null : `${Math.round(linesValue || 0)} lines`
            }
            comparisonLabel="Last period"
            comparisonValue={
              loadingMetrics
                ? null
                : `${Math.round(linesComparisonValue || 0)} lines`
            }
            loading={loadingMetrics}
            description="Median lines changed per merged PR"
          />
          <MetricStatCard
            title="Substantive Review ratio"
            periodLabel="Last 14 days"
            value={loadingMetrics ? null : subValue}
            comparisonLabel="Last period"
            comparisonValue={loadingMetrics ? null : subComparisonValue}
            loading={loadingMetrics}
            description="Ratio of your reviews where you left comments"
          />
        </div>
      </div>

      {/* Stories section - with header */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Hightlights from this period
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {!loadingStories ? (
            <StoryCardView story={story1} />
          ) : (
            <StoryCardSkeleton />
          )}
          {!loadingStories ? (
            <StoryCardView story={story2} />
          ) : (
            <StoryCardSkeleton />
          )}
          {!loadingStories ? (
            <StoryCardView story={story3} />
          ) : (
            <StoryCardSkeleton />
          )}
        </div>
      </div>

      {/* Recent work - with header */}
      <div>
        <RecentActivitySummaryCard
          periodLabel="Last 14 days"
          summary="Over the last two weeks, you merged 5 PRs and reviewed 11 others, with most work happening mid-week..."
          prSummary={{
            title: "PRs you touched",
            metricLabel: "merged",
            metricValue: "5",
            description: "Mostly dashboard layout refactors and search fixes.",
          }}
          reviewSummary={{
            title: "Reviews you gave",
            metricLabel: "reviews",
            metricValue: "13",
            description: "Focused on API edge cases and test coverage.",
          }}
          projectSummary={{
            title: "Key projects",
            metricLabel: "threads",
            metricValue: "3",
            description: "Dashboard V2, search caching, and auth hardening.",
          }}
          highlights={[
            {
              id: "1",
              kind: "pr_merged",
              title: "Merged “Improve dashboard layout”",
              meta: "184 lines • 1 review round",
            },
            {
              id: "2",
              kind: "review",
              title: "Reviewed “Search caching”",
              meta: "First responder • 42m latency",
            },
          ]}
        />
      </div>
    </main>
  );
}
