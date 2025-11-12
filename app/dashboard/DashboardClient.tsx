"use client";

import SyncButton from "@/components/dashboard/SyncButton";
import { SimpleMenu } from "./components/Menu";
import { MetricsAPI } from "@/lib/analysis/metrics/client";
import { useEffect, useMemo, useState } from "react";
import { StatResult } from "@/lib/analysis/metrics/types/output";
import { formatSeconds } from "@/lib/utils/date";

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

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <nav className="sticky top-0 z-30 bg-surface-alt border-b border-border shadow-[0_1px_20px_0_rgba(59,130,246,0.15)]">
        {" "}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight text-text-primary hover:text-accent transition-colors"
          >
            DevImpact
          </a>
          <SimpleMenu name={user.name} />
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl font-bold mb-6">Welcome back, {firstName}!</h2>

        <div className="bg-surface-alt rounded-xl border border-border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Sync your GitHub data</h3>
          <p className="text-text-secondary mb-4">
            Connect and refresh your work activity to keep your growth insights
            up to date.
          </p>
          <SyncButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </main>
    </div>
  );
}
