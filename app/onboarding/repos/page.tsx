"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { StepHeader } from "../components/StepHeader";

type FetchState = "idle" | "loading" | "error" | "ready" | "submitting";

interface RepoInfo {
  id: string;
  node_id: string;
  full_name: string;
  private: boolean;
}

export default function RepoSelector() {
  const router = useRouter();

  const [status, setStatus] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const reposByFullName = useMemo(
    () => new Map(repos.map((repo) => [repo.full_name, repo])),
    [repos],
  );

  // Fetch accessible repos
  useEffect(() => {
    const fetchRepos = async () => {
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch("/api/github/repos");
        if (!res.ok) throw new Error(`Failed to load repos (${res.status})`);
        const data = await res.json();
        const list: RepoInfo[] = Array.isArray(data)
          ? data
          : (data.repos ?? []);
        setRepos(list);

        // Default: preselect all
        const def: Record<string, boolean> = {};
        for (const r of list) def[r.full_name] = true;
        setSelected(def);
        setStatus("ready");
      } catch (e: any) {
        setError(e?.message ?? "Failed to load repositories");
        setStatus("error");
      }
    };
    fetchRepos();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [repos, query]);

  const allOn = useMemo(
    () => filtered.length > 0 && filtered.every((r) => selected[r.full_name]),
    [filtered, selected],
  );

  const toggleAll = () => {
    const next = { ...selected };
    const target = !allOn;
    for (const r of filtered) next[r.full_name] = target;
    setSelected(next);
  };

  const toggleOne = (repo: string) => {
    setSelected((old) => ({ ...old, [repo]: !old[repo] }));
  };

  const chosen = useMemo(() => {
    return Object.keys(selected)
      .filter((fullName) => selected[fullName])
      .map((fullName) => reposByFullName.get(fullName))
      .filter(Boolean) as RepoInfo[];
  }, [selected, reposByFullName]);

  const startSync = async () => {
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRepos: chosen,
          isInitialSync: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Sync failed (${res.status})`);
      }
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Failed to start sync");
      setStatus("ready");
    }
  };

  return (
    <OnboardingLayout>
      <StepHeader
        title="You're Connected!"
        description="Select which repositories you want DevImpact to analyze. You can change this anytime in Settings."
      />

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-background/60 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={status !== "ready" || filtered.length === 0}
          >
            {allOn ? "Deselect all" : "Select all"}
          </button>
          <div className="text-sm text-text-secondary">
            {chosen.length} selected
            {repos.length > 0 && ` of ${repos.length}`}
          </div>
        </div>
        <input
          type="text"
          placeholder="Filter repos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Error */}
      {status === "error" && error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Repo List */}
      <div className="max-h-[420px] overflow-auto rounded-xl border border-border bg-surface mb-6">
        {status === "loading" ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <li key={i} className="p-3 animate-pulse">
                <div className="h-4 w-56 rounded bg-surface-alt" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-secondary">
            {repos.length === 0
              ? "No repositories available with this token."
              : "No repositories match your filter."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((repo) => (
              <li
                key={repo.full_name}
                className="flex items-center justify-between p-3 hover:bg-background/40 transition"
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-accent cursor-pointer"
                    checked={!!selected[repo.full_name]}
                    onChange={() => toggleOne(repo.full_name)}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {repo.full_name}
                  </span>
                  {repo.private && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary">
                      Private
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={startSync}
          disabled={status !== "ready" || chosen.length === 0}
          className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${
            status !== "ready" || chosen.length === 0
              ? "bg-accent/60 text-text-secondary cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent-hover"
          }`}
        >
          {status === "submitting" ? "Starting sync..." : "Start Syncing"}
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="sm:w-auto rounded-xl border border-border bg-surface px-4 py-3 font-medium text-text-primary hover:bg-background/60 transition"
        >
          Skip for now
        </button>
      </div>

      {/* Help text */}
      <p className="mt-6 text-center text-xs text-text-tertiary">
        We only analyze the repositories you select. You can add or remove repos
        anytime in Settings.
      </p>
    </OnboardingLayout>
  );
}
