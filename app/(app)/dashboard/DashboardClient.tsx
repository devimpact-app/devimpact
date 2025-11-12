"use client";

import { MetricsAPI } from "@/lib/analysis/metrics/client";
import { useEffect, useMemo, useState } from "react";
import { StatResult } from "@/lib/analysis/metrics/types/output";
import { formatSeconds } from "@/lib/utils/date";
import {
  StoryCardSkeleton,
  StoryCardView,
} from "@/components/stories/StoryCardView";

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
          ],
        });

        const lead = batch.results.find(
          (r) => r.metricId === "pr.lead_time_seconds.v1" && r.shape === "stat",
        ) as StatResult | undefined;
        setLeadTimeStat(lead ?? null);
      } catch {
        setError("Failed to load metrics");
      } finally {
        setLoadingMetrics(false);
      }
    })();
  }, [catalog, startISO, endISO]);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!catalog) return <div>Loading metrics…</div>;

  const firstName = user.name?.split(" ")[0] ?? "there";
  const leadValue =
    leadTimeStat?.data?.find((d) => d.kind === "current")?.value ?? null;
  const comparisonValue =
    leadTimeStat?.data?.find((d) => d.kind === "comparison")?.value ?? null;

  console.log("story", story);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {firstName}!
          </h1>
          <p className="text-text-secondary">
            Here's what's happening with your work
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface-alt p-5">
            <div className="text-sm text-text-secondary">
              Avg PR lead time (30d)
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {loadingMetrics ? "…" : formatSeconds(leadValue)}
            </div>
            <div className="mt-2 text-xl">
              Last period:{" "}
              {loadingMetrics ? "…" : formatSeconds(comparisonValue)}
            </div>
            <div className="mt-1 text-xs text-text-tertiary">
              First commit → merge (merged PRs only)
            </div>
          </div>
        </div>

        {/* Stories section - with header */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Impact Stories</h2>
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
