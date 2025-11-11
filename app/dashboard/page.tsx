"use client";

import SyncButton from "@/components/dashboard/SyncButton";
import { SimpleMenu } from "./components/Menu";
import { MetricsAPI } from "@/lib/analysis/metrics/client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  // TODO: add gate for auth and for onboarding
  const [catalog, setCatalog] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <div className="text-red-500">{error}</div>;
  if (!catalog) return <div>Loading metrics…</div>;

  // const firstName = session.user.name?.split(" ")[0] ?? "there";

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
          {/* <SimpleMenu user={session.user} /> */}
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl font-bold mb-6">Welcome back, {"Ian"}!</h2>

        <div className="bg-surface-alt rounded-xl border border-border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Sync your GitHub data</h3>
          <p className="text-text-secondary mb-4">
            Connect and refresh your work activity to keep your growth insights
            up to date.
          </p>
          <SyncButton />
        </div>

        <p className="text-text-secondary">
          Your personal impact dashboard is in progress — soon you’ll see your
          highlights, focus time, and growth insights here.
        </p>
      </main>
    </div>
  );
}
