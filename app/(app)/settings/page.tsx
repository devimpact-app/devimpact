'use client';

import { useState } from 'react';
import { TerminalSquare, Trash2 } from 'lucide-react';

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export default function SettingsPage() {
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleResetCli() {
    setError(null);
    setSuccess(null);
    setResetLoading(true);
    try {
      await postJson('/api/settings/reset-cli');
      setSuccess(
        'CLI connection reset. Run `devimpact login` again on your machine to reconnect.'
      );
    } catch (e: any) {
      setError(e.message ?? 'Failed to reset CLI connection.');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleDeleteData() {
    setError(null);
    setSuccess(null);

    const confirmed = window.prompt(
      'This will delete all synced PRs, reviews, and activity from DevImpact.\n\nType DELETE to confirm.'
    );
    if (confirmed !== 'DELETE') return;

    setDeleteLoading(true);
    try {
      await postJson('/api/settings/delete-data');
      setSuccess(
        'All synced data deleted. You can resync from the CLI at any time.'
      );
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete data.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="mb-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Control your DevImpact account, CLI connection, and synced data.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-5 py-4 shadow-sm shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-slate-100">
              Account & data
            </h2>
            <p className="text-xs text-slate-400">
              These controls affect DevImpact&apos;s local database only. Your
              GitHub data and permissions stay under your control.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Reset CLI connection */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
                <TerminalSquare className="h-4 w-4 text-sky-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">
                  Reset CLI connection
                </p>
                <p className="text-xs text-slate-400">
                  Revoke your current CLI pairing. The next time you run{' '}
                  <code className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200">
                    devimpact login
                  </code>{' '}
                  you&apos;ll create a new connection.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetCli}
              disabled={resetLoading}
              className="rounded-full border border-sky-500/70 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetLoading ? 'Resetting…' : 'Reset CLI'}
            </button>
          </div>

          {/* Delete all synced data */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-red-900 bg-red-950">
                <Trash2 className="h-4 w-4 text-red-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-100">
                  Delete all synced data
                </p>
                <p className="text-xs text-red-200/80">
                  Permanently removes all PRs, reviews, activity and summaries
                  stored by DevImpact for your account. This does{' '}
                  <span className="font-semibold">not</span> affect GitHub or
                  any repositories.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeleteData}
              disabled={deleteLoading}
              className="rounded-full border border-red-500/80 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteLoading ? 'Deleting…' : 'Delete data'}
            </button>
          </div>
        </div>

        {(error || success) && (
          <div className="mt-4 space-y-1 text-xs">
            {error && (
              <p className="rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-red-200">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-md border border-emerald-900 bg-emerald-950/60 px-3 py-2 text-emerald-200">
                {success}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
