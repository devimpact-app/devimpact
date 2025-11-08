"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FetchState = "idle" | "loading" | "error" | "ready" | "submitting";

interface RepoInfo {
  id: string;
  node_id: string;
  full_name: string;
  private: boolean;
}

export default function RepoSelector() {
  const router = useRouter();
  const search = useSearchParams();

  const [status, setStatus] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const reposByFullName = useMemo(
    () => new Map(repos.map((repo) => [repo.full_name, repo])),
    [repos],
  );

  // Fetch accessible repos once connected
  useEffect(() => {
    const fetchRepos = async () => {
      setStatus("loading");
      setError(null);
      try {
        const url = new URL("/api/github/repos", window.location.origin);
        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) throw new Error(`Failed to load repos (${res.status})`);
        const data = await res.json();
        const list: RepoInfo[] = Array.isArray(data)
          ? data
          : (data.repos ?? []);
        setRepos(list);
        // default: preselect all (flip to false if you prefer)
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

  // Get selected repos
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
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to start sync");
      setStatus("ready");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-7">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-3">
              <span className="text-2xl">✅</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              You’re connected!
            </h1>
            <p className="text-gray-600 mt-2">
              Select which repositories you want DevImpact to analyze. You can
              change this anytime in Settings.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                disabled={status !== "ready" || filtered.length === 0}
              >
                {allOn ? "Deselect all (shown)" : "Select all (shown)"}
              </button>
              <div className="text-sm text-gray-600">
                {chosen.length} selected
                {repos.length ? ` / ${repos.length}` : ""}
              </div>
            </div>
            <input
              type="text"
              placeholder="Filter repos…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {status === "error" && error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* List */}
          <div className="max-h-[420px] overflow-auto rounded-lg border border-gray-200">
            {status === "loading" ? (
              <ul className="divide-y divide-gray-100">
                {Array.from({ length: 10 }).map((_, i) => (
                  <li key={i} className="p-3 animate-pulse">
                    <div className="h-4 w-56 rounded bg-gray-200" />
                  </li>
                ))}
              </ul>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">
                {repos.length === 0
                  ? "No repositories available with this authorization."
                  : "No repositories match your filter."}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((repo) => (
                  <li
                    key={repo.full_name}
                    className="flex items-center justify-between p-3"
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={!!selected[repo.full_name]}
                        onChange={() => toggleOne(repo.full_name)}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {repo.full_name}
                      </span>
                    </label>
                    {/* optional: org badge */}
                    <span className="text-xs text-gray-500">
                      {repo.full_name.split("/")[0]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={startSync}
              disabled={status !== "ready" || chosen.length === 0}
              className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {status === "submitting" ? "Starting…" : "Start Syncing"}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full sm:w-auto rounded-lg border px-4 py-2.5 text-gray-700 hover:bg-gray-50"
            >
              Do this later
            </button>
          </div>
        </div>

        {/* Tiny help block */}
        <p className="mt-4 text-center text-xs text-gray-500">
          We only analyze the repositories you select. You can add or remove
          repos anytime.
        </p>
      </div>
    </div>
  );
}
