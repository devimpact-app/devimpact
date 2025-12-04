'use client';

import { useMemo } from 'react';
import { OneOnOnePrep } from '@/types/api/one-on-one';
import { formatDateTime } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Trash2 } from 'lucide-react';

function prettyCounterpartType(counterpartType: string) {
  return counterpartType
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

const statusStyles: Record<string, string> = {
  ready: 'border-indigo-500/70 bg-indigo-600/20 text-indigo-100',
  generating: 'bg-slate-100 text-slate-700 border-slate-200',
  archived: 'bg-slate-100 text-slate-700 border-slate-200',
  error: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function OneOnOneHeader({
  prep,
  onDeleteClick,
  onRegenerateClick,
}: {
  prep: OneOnOnePrep;
  onDeleteClick?: (id: string) => void;
  onRegenerateClick?: (id: string) => void;
}) {
  const router = useRouter();
  const meetingLabel = useMemo(
    () => formatDateTime(prep.meetingAt),
    [prep.meetingAt]
  );

  const title =
    prep.title ??
    (prep.counterpartLabel
      ? `1:1 with ${prep.counterpartLabel}`
      : '1:1 session');

  const counterpartDisplay = prep.counterpartLabel
    ? `${prep.counterpartLabel} · ${prettyCounterpartType(prep.counterpartType)}`
    : prettyCounterpartType(prep.counterpartType);

  const statusClass =
    statusStyles[prep.status] ?? 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <header className="">
      <button
        onClick={() => router.push('/prep')}
        className="text-sm text-text-secondary hover:text-text-primary mb-4"
      >
        ← Back to all 1:1s
      </button>

      <div className="flex justify-between items-start">
        {/* LEFT */}
        <div className="space-y-3">
          <div className="flex flex-row items-center">
            <h1 className="text-3xl font-semibold text-text-primary">
              {title}
            </h1>
            <span
              className={`ml-2 inline-flex items-center rounded-full border h-6 px-3 py-1 text-xs font-medium ${statusClass}`}
            >
              {prep.status.charAt(0).toUpperCase() + prep.status.slice(1)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            {meetingLabel && <span>{meetingLabel}</span>}
            <span className="w-1 h-1 rounded-full bg-border-muted" />
            <span>{counterpartDisplay}</span>
          </div>
        </div>

        <div className="flex items-end gap-3">
          {onRegenerateClick && (
            <div className="relative group">
              <button
                type="button"
                onClick={() => onRegenerateClick(prep.id)}
                className="flex items-center justify-center h-9 w-9 rounded-full border border-white/15
                 bg-surface-lower text-text-secondary hover:text-text-primary transition"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <div
                className="pointer-events-none absolute right-0 top-full mt-1
                 opacity-0 group-hover:opacity-100 transition
                 whitespace-nowrap rounded-md bg-surface-elevated px-2 py-1 text-xs text-text-primary
                 shadow-lg"
              >
                Regenerate
              </div>
            </div>
          )}

          {onDeleteClick && (
            <div className="relative group">
              <button
                type="button"
                onClick={() => onDeleteClick(prep.id)}
                disabled={prep.status === 'archived'}
                className="flex items-center justify-center h-9 w-9 rounded-full
                 bg-red-400/20 text-red-300 hover:bg-red-400/30 transition
                 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div
                className="pointer-events-none absolute right-0 top-full mt-1
                 opacity-0 group-hover:opacity-100 transition
                 whitespace-nowrap rounded-md px-2 py-1 text-xs text-text-primary
                 shadow-lg"
              >
                {prep.status === 'ready' ? 'Delete' : 'Archived'}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
