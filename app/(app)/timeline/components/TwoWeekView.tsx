import { LegendDot, TimelineDot } from "./DotLogic";
import { OneWeekView } from "./OneWeekView";

export function TwoWeekSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3 animate-pulse space-y-5">
      <div className="mb-1 h-3 w-32 rounded bg-slate-700/30" />

      {[0, 1].map((row) => (
        <div key={row}>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-[220px] w-full rounded-md bg-slate-800/40 border border-slate-700/50" />
                <div className="h-3 w-8 rounded bg-slate-700/30" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

type TwoWeekSkeletonProps = {
  weekdayLabels: string[];
  week1DotsByDay: Record<number, TimelineDot[]>;
  week2DotsByDay: Record<number, TimelineDot[]>;
  week1Start: Date;
  week2Start: Date;
};

export function TwoWeekView({
  weekdayLabels,
  week1DotsByDay,
  week2DotsByDay,
  // week1Start,
  // week2Start,
}: TwoWeekSkeletonProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Activity the last 2 weeks
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
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
      <div className="space-y-3">
        <OneWeekView
          weekdayLabels={weekdayLabels}
          dotsByDay={week2DotsByDay}
          hideContainer
        />
        <OneWeekView
          weekdayLabels={weekdayLabels}
          dotsByDay={week1DotsByDay}
          hideContainer
        />
      </div>
    </section>
  );
}
