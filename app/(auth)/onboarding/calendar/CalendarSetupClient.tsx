'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Shield } from 'lucide-react';
import Link from 'next/link';
import {
  AvailableCalendar,
  CalendarStatusResponse,
  CalendarStatusResponseSchema,
  ListAvailableCalendarResponseSchema,
} from '@/types/api/calendar';

export default function CalendarSetupClient({
  isFromSettings,
  initialStatus,
}: {
  isFromSettings: boolean;
  initialStatus?: CalendarStatusResponse | null;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<CalendarStatusResponse | null>(
    initialStatus ?? null
  );
  const [loadingStatus, setLoadingStatus] = useState(!initialStatus);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [calendars, setCalendars] = useState<AvailableCalendar[] | null>(null);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function refreshStatus() {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/calendar/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Status failed: ${res.status}`);
      const { data } = await res.json();
      const parsed = CalendarStatusResponseSchema.parse(data);
      setStatus(parsed);
    } catch (err) {
      setStatusError('Couldn’t load calendar status. Please refresh.');
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadCalendars() {
    setLoadingCalendars(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/calendar/calendars', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Calendars failed: ${res.status}`);
      const { data } = await res.json();
      const parsed = ListAvailableCalendarResponseSchema.parse(data);
      setCalendars(parsed.calendars);
    } catch (err) {
      setSyncError(
        'Couldn’t load calendars. Try reconnecting Google Calendar.'
      );
    } finally {
      setLoadingCalendars(false);
    }
  }

  useEffect(() => {
    if (!status && !initialStatus) {
      refreshStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load calendars only when we’re connected and selection UI is relevant
  useEffect(() => {
    if (!status) return;
    if (!status.connected) return;

    const needsList =
      status.state === 'connected_no_selection' ||
      status.state === 'ready_to_sync' ||
      status.state === 'syncing' ||
      status.state === 'synced';

    if (needsList && !calendars) {
      loadCalendars();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.state]);

  function toggleCalendar(id: string) {
    if (!calendars) return;
    setCalendars(
      calendars.map((c) =>
        c.id === id ? { ...c, isSelected: !c.isSelected } : c
      )
    );
  }

  async function saveSelection() {
    if (!calendars) return;
    setSavingSelection(true);
    setSyncError(null);

    try {
      const selectedCalendarIds = calendars
        .filter((c) => c.isSelected)
        .map((c) => c.id);

      const res = await fetch('/api/calendar/calendars/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedCalendarIds }),
      });

      if (!res.ok) throw new Error(`Save failed: ${res.status}`);

      await refreshStatus();
    } catch (err) {
      setSyncError('Couldn’t save calendar selection. Please try again.');
    } finally {
      setSavingSelection(false);
    }
  }

  async function startSync() {
    setSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

      await refreshStatus();

      // On onboarding, you’ll likely redirect after a small success delay
      if (!isFromSettings) {
        setTimeout(() => router.push('/onboarding/complete'), 900);
      }
    } catch (err) {
      setSyncError(
        'Calendar sync failed. Try again, or reconnect Google Calendar.'
      );
    } finally {
      setSyncing(false);
    }
  }

  function handleSkip() {
    if (isFromSettings) {
      router.push('/settings');
    } else {
      router.push('/onboarding/complete');
    }
  }

  // ---------- derived ----------

  const selectedCount = calendars?.filter((c) => c.isSelected).length ?? 0;
  const totalCount = calendars?.length ?? 0;

  const primaryCalendars = useMemo(() => {
    if (!calendars) return [];
    return calendars.filter((c) => c.isPrimary);
  }, [calendars]);

  const otherCalendars = useMemo(() => {
    if (!calendars) return [];
    return calendars.filter((c) => !c.isPrimary);
  }, [calendars]);

  const showSelection =
    status?.connected &&
    (status.state === 'connected_no_selection' ||
      status.state === 'ready_to_sync' ||
      status.state === 'syncing' ||
      status.state === 'synced');

  const showSyncPanel =
    status?.connected &&
    (status.state === 'ready_to_sync' ||
      status.state === 'syncing' ||
      status.state === 'synced');

  const syncInProgress = syncing || status?.state === 'syncing';

  if (loadingStatus && !status) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 px-6 py-8 shadow-sm">
        <p className="text-sm text-slate-400">
          Checking your calendar connection&hellip;
        </p>
      </section>
    );
  }

  if (statusError && !status) {
    return (
      <section className="rounded-3xl border border-red-900/60 bg-red-950/30 px-6 py-8">
        <p className="text-sm text-red-200">{statusError}</p>
        <button
          type="button"
          onClick={refreshStatus}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </section>
    );
  }

  const connected = Boolean(status?.connected);

  return (
    <section className="flex flex-col">
      <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/40 px-6 py-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-100">
                Google Calendar
              </h1>
              <p className="mt-1 text-sm text-slate-400 max-w-xl">
                DevImpact uses only read-only calendar and event metadata from
                Google
              </p>
            </div>

            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : (
              <Link
                href="/api/integrations/google/start"
                className="inline-flex h-9 items-center justify-center rounded-full bg-sky-500 px-4 text-xs font-medium text-slate-950 shadow-sm hover:bg-sky-400"
              >
                Connect calendar (read-only)
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            What we use (and what we don’t)
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-400">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                We store
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Start/end times (time blocks)</li>
                <li>Your RSVP status (yes/no/maybe)</li>
                <li>Attendee count</li>
                <li>Derived event categories (e.g. 1:1s, team meetings)</li>
              </ul>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                We don’t store
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Event titles or descriptions</li>
                <li>Guest emails or lists</li>
                <li>Meeting links, notes, or attachments</li>
              </ul>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            You can disconnect anytime in Settings to immediately stop calendar
            reads.
          </p>
        </div>

        {connected && showSelection && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Calendar selection
                </div>
                <div className="text-xs text-slate-400">
                  {selectedCount} selected · {totalCount} available
                </div>
              </div>

              <button
                type="button"
                onClick={saveSelection}
                disabled={savingSelection || loadingCalendars || !calendars}
                className="inline-flex h-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-60"
              >
                {savingSelection ? 'Saving…' : 'Save selection'}
              </button>
            </div>

            {loadingCalendars && !calendars && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-4">
                <p className="text-sm text-slate-400">
                  Loading your calendars&hellip;
                </p>
              </div>
            )}

            {calendars && (
              <div className="space-y-4">
                {primaryCalendars.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Primary
                    </div>
                    <div className="space-y-1">
                      {primaryCalendars.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center justify-between rounded-xl border border-transparent px-2 py-1.5 text-xs text-slate-200 hover:border-slate-700 hover:bg-slate-900"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
                              checked={Boolean(c.isSelected)}
                              onChange={() => toggleCalendar(c.id)}
                            />
                            <span className="font-mono text-[11px]">
                              {c.summary}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {c.accessRole ?? 'reader'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {otherCalendars.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Other calendars
                    </div>
                    <div className="max-h-[260px] space-y-1 overflow-y-auto no-scrollbar pr-1">
                      {otherCalendars.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center justify-between rounded-xl border border-transparent px-2 py-1.5 text-xs text-slate-200 hover:border-slate-700 hover:bg-slate-900"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
                              checked={Boolean(c.isSelected)}
                              onChange={() => toggleCalendar(c.id)}
                            />
                            <span className="font-mono text-[11px]">
                              {c.summary}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {c.accessRole ?? 'reader'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {syncError && (
              <p className="mt-3 text-xs text-red-300">{syncError}</p>
            )}
          </div>
        )}

        {connected && showSyncPanel && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Calendar sync
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Reads the last 90 days and stores only non-sensitive metadata.
                </p>
              </div>
              <button
                type="button"
                onClick={startSync}
                disabled={syncInProgress || selectedCount === 0}
                className="inline-flex h-8 items-center justify-center rounded-full bg-sky-500 px-3 text-xs font-medium text-slate-950 shadow-sm hover:bg-sky-400 disabled:opacity-60"
              >
                {syncInProgress ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Syncing…
                  </span>
                ) : (
                  'Sync calendar'
                )}
              </button>
            </div>

            {selectedCount === 0 && (
              <p className="mt-2 text-[11px] text-slate-500">
                Select at least one calendar above to enable sync.
              </p>
            )}

            {status?.lastSyncRun && (
              <p className="mt-2 text-[11px] text-slate-500">
                Last synced:{' '}
                <span className="text-slate-300">
                  {new Date(status.lastSyncRun.startedAt).toLocaleString()}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
      {!isFromSettings && (
        <div className="mt-8 flex items-center justify-between text-sm text-text-secondary">
          <button
            onClick={handleSkip}
            className="text-sky-600 hover:text-sky-400"
          >
            Skip for now
          </button>
          <span>You can connect later from Settings.</span>
        </div>
      )}
    </section>
  );
}
