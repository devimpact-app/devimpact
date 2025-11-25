'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

type WeekNavigatorProps = {
  /** Main label, e.g. "This week", "Last week", "Nov 3–9" */
  label: string;
  /** Optional smaller line, e.g. "Nov 3–9, 2025" */
  subLabel?: string;
  /** Disable going forward if we're already at the latest week */
  canGoForward?: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export function WeekNavigator({
  label,
  subLabel,
  canGoForward = false,
  onPrevWeek,
  onNextWeek,
}: WeekNavigatorProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 shadow-sm shadow-black/30">
      <button
        type="button"
        onClick={onPrevWeek}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900 hover:border-slate-500 hover:bg-slate-800 transition-colors"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-slate-200" />
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90">
          <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium text-slate-50">{label}</span>
          {subLabel && (
            <span className="text-[10px] text-slate-400">{subLabel}</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onNextWeek}
        disabled={!canGoForward}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900 hover:border-slate-500 hover:bg-slate-800 disabled:border-slate-800 disabled:bg-slate-900/60 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
        aria-label="Next week"
      >
        <ChevronRight className="h-3.5 w-3.5 text-slate-200" />
      </button>
    </div>
  );
}
