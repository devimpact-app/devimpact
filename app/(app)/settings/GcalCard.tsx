import Link from 'next/link';
import { Calendar, ChevronDown, Container } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type GoogleCalendarCardProps = {
  calendarDisconnected: boolean;
  disconnectLoading: boolean;
  selectedCalendarsCount: number;
  availableCalendarsCount: number;
  handleConnectClick: () => void;
  connectText: string;
};

export function GoogleCalendarCard({
  calendarDisconnected,
  selectedCalendarsCount,
  availableCalendarsCount,
  handleConnectClick,
  disconnectLoading,
  connectText,
}: GoogleCalendarCardProps) {
  const router = useRouter();

  const hasAvailableCalendars = availableCalendarsCount > 0;
  function handleManageCalendars() {
    router.push('/onboarding/calendar?fromSettings=true');
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-3">
          <div className="mt-0.5 flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
            <Calendar className="h-4 w-4 text-slate-100" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-100">
              Google Calendar
            </p>
            <p className="text-xs text-slate-400">
              Use calendar context to understand how meetings and focus time
              affect your review and shipping loops.
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-2">
          {!calendarDisconnected && (
            <button
              type="button"
              onClick={handleManageCalendars}
              className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
            >
              Manage calendars
            </button>
          )}
          <button
            type="button"
            onClick={handleConnectClick}
            disabled={disconnectLoading}
            className="rounded-full border border-sky-500/70 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connectText}
          </button>
        </div>
      </div>

      {!calendarDisconnected && (
        <div className="ml-12 mt-2 flex flex-col gap-1 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center flex-wrap gap-1.5">
            <Container className="h-3 w-3 text-sky-300" />
            <span>Connected via Oauth</span>
            {hasAvailableCalendars && (
              <span className="ml-1 text-slate-400">
                • {selectedCalendarsCount} of {availableCalendarsCount} calendar
                {availableCalendarsCount === 1 ? '' : 's'} selected
              </span>
            )}
          </div>
        </div>
      )}

      {calendarDisconnected && (
        <div className="mt-2 ml-12 text-xs text-slate-500">
          Connect Google Calendar to add meeting context (read-only). You can
          choose which calendars to include after connecting.
        </div>
      )}
    </div>
  );
}
