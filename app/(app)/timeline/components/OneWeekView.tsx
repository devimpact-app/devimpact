import { ActivityEvent } from '@/types/api/timeline';
import { LegendDot, TimelineDot } from './DotLogic';
import { TimelineBlock } from './BlockLogic';
import { DayColumn } from './DayColumn';

export function OneWeekSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3 animate-pulse">
      <div className="mb-2 h-3 w-28 rounded bg-slate-700/30" />

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-[300px] w-full rounded-md bg-slate-800/40 border border-slate-700/50" />
            <div className="h-3 w-8 rounded bg-slate-700/30" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function OneWeekView({
  weekdayLabels,
  dotsByDay,
  blocksByDay,
  hideContainer = false,
  label,
  onEventClick,
}: {
  weekdayLabels: string[];
  dotsByDay: Record<number, TimelineDot[]>;
  blocksByDay: Record<number, TimelineBlock[]>;
  hideContainer?: boolean;
  label?: string;
  onEventClick?: (event: ActivityEvent) => void;
}) {
  if (hideContainer) {
    return (
      <div className="grid grid-cols-7 gap-5">
        {weekdayLabels.map((label, idx) => (
          <DayColumn
            key={idx}
            dayIndex={idx}
            label={label}
            dots={dotsByDay[idx] ?? []}
            blocks={blocksByDay[idx] ?? []}
          />
        ))}
      </div>
    );
  }
  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {label ? label : 'Activity this week'}
        </h3>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-red-400 border-red-300" />
            <span>Commits</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-emerald-400 border-emerald-300" />
            <span>PR Events</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-sky-400 border-sky-300" />
            <span>Reviews</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-slate-400 border-slate-300" />
            <span>Other</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-5">
        {weekdayLabels.map((label, idx) => (
          <DayColumn
            key={idx}
            dayIndex={idx}
            label={label}
            dots={dotsByDay[idx] ?? []}
            blocks={blocksByDay[idx] ?? []}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </section>
  );
}
