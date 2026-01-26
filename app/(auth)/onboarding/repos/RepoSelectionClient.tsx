'use client';

import {
  AvailableGithubRepo,
  AvailableGithubResponse,
} from '@/types/api/repos';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function RepoSelectionClient({
  githubUsername,
  isFromSettings,
}: {
  githubUsername?: string | null;
  isFromSettings: boolean;
}) {
  const router = useRouter();
  const [repos, setRepos] = useState<AvailableGithubRepo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/repos', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const { data }: { data: AvailableGithubResponse } = await res.json();
        if (!cancelled) {
          setRepos(data.repos);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            'Couldn’t load repos. Try re-running `devimpact init` or `devimpact update-repos`.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRepos = useMemo(() => {
    if (!repos) return [];
    const q = search.trim().toLowerCase();
    if (!q) return repos;

    return repos.filter((r) => {
      const haystack = `${r.fullName} ${r.owner}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [repos, search]);

  const ownerGroups = useMemo(() => {
    const byOwner: Record<string, AvailableGithubRepo[]> = {};

    for (const repo of filteredRepos) {
      if (!byOwner[repo.owner]) byOwner[repo.owner] = [];
      byOwner[repo.owner].push(repo);
    }

    Object.values(byOwner).forEach((arr) =>
      arr.sort((a, b) => a.name.localeCompare(b.name))
    );

    const getLatestPushedAt = (repos: AvailableGithubRepo[]) =>
      repos.reduce((latest, repo) => {
        if (!repo.pushedAt) return latest;
        const t = new Date(repo.pushedAt).getTime();
        return t > latest ? t : latest;
      }, 0);

    return Object.entries(byOwner).sort(
      ([ownerA, reposA], [ownerB, reposB]) => {
        const isPersonalA = ownerA === githubUsername;
        const isPersonalB = ownerB === githubUsername;

        if (isPersonalA && !isPersonalB) return 1;
        if (!isPersonalA && isPersonalB) return -1;

        const latestA = getLatestPushedAt(reposA);
        const latestB = getLatestPushedAt(reposB);

        return latestB - latestA;
      }
    );
  }, [filteredRepos, githubUsername]);

  const selectedCount = repos?.filter((r) => r.isSelected).length ?? 0;

  function toggleRepo(id: string) {
    if (!repos) return;
    setRepos(
      repos.map((r) => (r.id === id ? { ...r, isSelected: !r.isSelected } : r))
    );
  }

  function setAllSelected(isSelected: boolean) {
    if (!repos) return;
    setRepos(repos.map((r) => ({ ...r, isSelected })));
  }

  async function handleSave() {
    if (!repos) return;
    setSaving(true);
    setError(null);
    try {
      const selectedRepoIds = repos
        .filter((r) => r.isSelected)
        .map((r) => r.id);

      const res = await fetch('/api/repos/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedRepoIds }),
      });

      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }

      if (isFromSettings) {
        router.push('/settings');
      } else {
        router.push('/onboarding/cli');
      }
    } catch (err) {
      setError('Couldn’t save selection. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !repos) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 px-6 py-8 shadow-sm">
        <p className="text-sm text-slate-400">
          Discovering your repos via the GitHub CLI&hellip;
        </p>
      </section>
    );
  }

  if (error && !repos) {
    return (
      <section className="rounded-3xl border border-red-900/60 bg-red-950/30 px-6 py-8">
        <p className="text-sm text-red-200">{error}</p>
        <p className="mt-2 text-xs text-red-300">
          Make sure you’ve run{' '}
          <code className="rounded bg-slate-900 px-1 py-[1px] font-mono">
            devimpact init
          </code>{' '}
          on a machine with{' '}
          <code className="rounded bg-slate-900 px-1 py-[1px] font-mono">
            gh
          </code>{' '}
          authenticated.
        </p>
      </section>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 px-6 py-8 shadow-sm">
        <p className="text-sm text-slate-300">
          We haven’t seen any repos yet for your GitHub account.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          From a machine where{' '}
          <code className="rounded bg-slate-900 px-1 py-[1px] font-mono">
            gh
          </code>{' '}
          is authenticated, run:
        </p>
        <p className="mt-2 text-xs text-slate-300">
          <code className="rounded bg-slate-900 px-1 py-[1px] font-mono">
            devimpact init --cli-token &lt;CODE&gt;
          </code>
        </p>
        <p className="mt-2 text-xs text-slate-400">
          If you’ve already linked the CLI but don’t see your repos yet, run:
        </p>
        <p className="mt-1 text-xs text-slate-300">
          <code className="rounded bg-slate-900 px-1 py-[1px] font-mono">
            devimpact discover-repos
          </code>
          , then refresh this page.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/40 px-5 py-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Repo selection
            </div>
            <div className="text-xs text-slate-400">
              {selectedCount} selected · {repos.length} available
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Filter by name or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-64"
            />
            <div className="flex gap-2 text-xs text-slate-400">
              <button
                type="button"
                className="rounded-full border border-slate-700/80 px-2 py-[3px] hover:bg-slate-800"
                onClick={() => setAllSelected(true)}
              >
                Select all
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700/80 px-2 py-[3px] hover:bg-slate-800"
                onClick={() => setAllSelected(false)}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[400px] space-y-4 overflow-y-auto no-scrollbar pr-1">
          {ownerGroups.map(([owner, ownerRepos]) => (
            <div key={owner}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {owner}
              </div>
              <div className="space-y-1">
                {ownerRepos.map((repo) => (
                  <label
                    key={repo.id}
                    className="flex items-center justify-between rounded-xl border border-transparent px-2 py-1.5 text-xs text-slate-200 hover:border-slate-700 hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
                        checked={repo.isSelected}
                        onChange={() => toggleRepo(repo.id)}
                      />
                      <span className="font-mono text-xs">{repo.fullName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      {repo.isPrivate && (
                        <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                          Private
                        </span>
                      )}
                      {repo.pushedAt && (
                        <span className="text-slate-500">
                          Updated {new Date(repo.pushedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

        <div className="mt-5 flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            When you run{' '}
            <code className="rounded bg-slate-950 px-1 py-[1px] font-mono">
              devimpact sync
            </code>
            , DevImpact will use only the repos you’ve selected here.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center justify-center rounded-full bg-sky-500 px-4 text-xs font-medium text-slate-950 shadow-sm hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save selection'}
          </button>
        </div>
      </div>

      <aside className="w-full max-w-xs space-y-3 text-xs text-slate-400">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-4 shadow-sm">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            What should I pick?
          </div>
          <p className="mb-2">
            Start with 2–5 repos where you open most of your PRs and review a
            lot of code. You can always update this list later.
          </p>
          <p className="mb-2">
            DevImpact ignores any repo you don’t select here, even if the CLI
            can see it.
          </p>
          <p className="mt-2 text-slate-500 font-semibold">
            Not seeing a repo you expect? From a machine with{' '}
            <code className="rounded bg-slate-900 px-1 py-[1px] font-mono">
              gh
            </code>{' '}
            authenticated, run{' '}
            <code className="rounded bg-slate-900 px-1 py-[1px] font-mono">
              devimpact discover-repos
            </code>
            , then refresh this page.
          </p>
        </div>
      </aside>
    </section>
  );
}
