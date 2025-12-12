import Link from 'next/link';
import { Calendar } from 'lucide-react';

export function GoogleCalendarCard({
  isEnabled = true,
  isConnected = false,
  connectedEmail,
}: {
  isEnabled?: boolean;
  isConnected?: boolean;
  connectedEmail?: string | null;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border border-slate-800/70 bg-slate-950/40 px-4 py-3.5 ${
        !isEnabled ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950">
          <Calendar className="h-4 w-4 text-slate-300" />
        </div>

        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
            Google Calendar
            {!isEnabled && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                Coming soon
              </span>
            )}
            {isEnabled && isConnected && (
              <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                Connected
              </span>
            )}
          </p>

          <p className="text-xs text-slate-500">
            Use calendar context to understand how meetings and focus time
            affect your review and shipping loops.
          </p>

          {isEnabled && isConnected && connectedEmail && (
            <p className="text-[11px] text-slate-500">
              Connected as{' '}
              <span className="text-slate-300">{connectedEmail}</span>
            </p>
          )}
        </div>
      </div>

      {isEnabled && (
        <div className="flex flex-col items-end gap-2">
          {isConnected ? (
            <button
              type="button"
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              // later: router.push("/settings/integrations/google") or disconnect flow
              onClick={() => {}}
            >
              Manage
            </button>
          ) : (
            <Link
              target="_blank"
              href="/api/integrations/google/start"
              className="rounded-full border border-sky-500/70 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
            >
              Connect
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
