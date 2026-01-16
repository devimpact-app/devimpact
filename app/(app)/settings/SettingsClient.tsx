'use client';

import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { signOutAction } from '../dashboard/actions';
import { useRouter } from 'next/navigation';
import { GithubCliCard } from './GithubCard';
import { GoogleCalendarCard } from './GcalCard';
import { postJson } from '@/components/api';

export function SettingsClient({
  cliDisconnected,
  selectedReposCount,
  availableReposCount,
  calendarDisconnected,
  selectedCalendarsCount,
  availableCalendarsCount,
}: {
  cliDisconnected: boolean;
  selectedReposCount: number;
  availableReposCount: number;
  calendarDisconnected: boolean;
  selectedCalendarsCount: number;
  availableCalendarsCount: number;
}) {
  const router = useRouter();
  const [resetLoading, setResetLoading] = useState(false);
  const [calendarDisconnectLoading, setCalendarDisconnectLoading] =
    useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cliText = cliDisconnected
    ? 'Connect CLI'
    : resetLoading
      ? 'Resetting…'
      : 'Reset CLI';
  async function handleCliClick() {
    if (cliDisconnected) {
      router.push('/onboarding/cli?fromSettings=true');
      return;
    }
    setError(null);
    setSuccess(null);
    setResetLoading(true);
    try {
      await postJson('/api/settings/reset-cli');
      setSuccess(
        'CLI connection reset. You will need to follow connection instructions to get going again.'
      );
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Failed to reset CLI connection.');
    } finally {
      setResetLoading(false);
    }
  }

  const calendarConnectText = calendarDisconnected ? 'Connect' : 'Disconnect';
  async function handleConnectCalendarClick() {
    if (calendarDisconnected) {
      router.push('/onboarding/calendar?fromSettings=true');
      return;
    }
    setError(null);
    setSuccess(null);
    setCalendarDisconnectLoading(true);
    try {
      await postJson('/api/settings/reset-calendar');
      setSuccess(
        'Calendar disconnected. You will need to follow connection instructions to get going again.'
      );
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Failed to reset calendar connection.');
    } finally {
      setCalendarDisconnectLoading(false);
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="mb-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Control your DevImpact integrations, account, and synced data.
        </p>
      </header>

      {/* Integrations */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-5 py-4 shadow-sm shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-slate-100">Integrations</h2>
            <p className="text-xs text-slate-400">
              Connect DevImpact to the tools you already use for work.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <GithubCliCard
            cliDisconnected={cliDisconnected}
            resetLoading={resetLoading}
            cliText={cliText}
            selectedReposCount={selectedReposCount}
            availableReposCount={availableReposCount}
            handleCliClick={handleCliClick}
          />

          <GoogleCalendarCard
            disconnectLoading={calendarDisconnectLoading}
            connectText={calendarConnectText}
            handleConnectClick={handleConnectCalendarClick}
            calendarDisconnected={calendarDisconnected}
            selectedCalendarsCount={selectedCalendarsCount}
            availableCalendarsCount={availableCalendarsCount}
          />
        </div>
      </section>

      {/* Account & data */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-5 py-4 shadow-sm shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-slate-100">
              Account & data
            </h2>
            <p className="text-xs text-slate-400">
              These controls affect DevImpact&apos;s own database only. Your
              GitHub data and permissions stay under your control.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Delete all synced data */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex min-h-8 min-w-8 items-center justify-center rounded-lg border border-red-900 bg-red-950">
                <Trash2 className="h-4 w-4 text-red-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-100">
                  Delete all synced data
                </p>
                <p className="text-xs text-red-200/80">
                  Permanently removes all metadata about PRs, reviews, activity
                  and summaries stored by DevImpact for your account. This does{' '}
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

          {/* Log out */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex min-h-8 min-w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
                <LogOut className="h-4 w-4 text-slate-200" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">Log out</p>
                <p className="text-xs text-slate-400">
                  Sign out of DevImpact on this browser. You can sign back in at
                  any time without losing synced data.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOutAction}
              disabled={logoutLoading}
              className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {logoutLoading ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      </section>

      {(error || success) && (
        <div className="space-y-1 text-xs">
          {error && (
            <p className="rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-red-200">
              There was an error processing your request. Please try again
              later.
            </p>
          )}
          {success && (
            <p className="rounded-md border border-emerald-900 bg-emerald-950/60 px-3 py-2 text-emerald-200">
              {success}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
