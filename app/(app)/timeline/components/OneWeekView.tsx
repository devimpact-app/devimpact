import { ActivityEvent, ActivityEventKind } from "@/types/api/timeline";
import { dotColor, kindLabel, LegendDot, TimelineDot } from "./DotLogic";
import { useState } from "react";
import { formatTimeIso } from "@/lib/utils/date";

const LANE_COUNT = 3;

export function OneWeekSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3 animate-pulse">
      <div className="mb-2 h-3 w-28 rounded bg-slate-700/30" />

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-[220px] w-full rounded-md bg-slate-800/40 border border-slate-700/50" />
            <div className="h-3 w-8 rounded bg-slate-700/30" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DayColumn({
  dayIndex,
  label,
  dots,
  onEventClick,
}: {
  dayIndex: number;
  label: string;
  dots: TimelineDot[];
  onEventClick?: (event: ActivityEvent) => void;
}) {
  const [hoveredDot, setHoveredDot] = useState<TimelineDot | null>(null);

  return (
    <div key={label} className="flex flex-col items-center gap-1">
      <div className="h-[220px] w-full rounded-md border border-slate-700 bg-slate-900 relative">
        <div className="absolute inset-0 pointer-events-none">
          {/* 25% */}
          <div className="absolute left-0 right-0 top-[25%] border-t border-border">
            <span className="absolute left-1 -translate-y-1/2 text-[10px] text-text-tertiary/50">
              6a
            </span>
          </div>

          {/* 50% */}
          <div className="absolute left-0 right-0 top-1/2 border-t border-border">
            <span className="absolute left-1 -translate-y-1/2 text-[10px] text-text-tertiary/50">
              12p
            </span>
          </div>

          {/* 75% */}
          <div className="absolute left-0 right-0 top-[75%] border-t border-border">
            <span className="absolute left-1 -translate-y-1/2 text-[10px] text-text-tertiary/50">
              6p
            </span>
          </div>
        </div>
        <div className="absolute inset-x-0 top-4 bottom-4">
          {dots.map((dot) => {
            const jitterUnit = (dot.laneIndex - 1) / (LANE_COUNT - 1); // -0.5, 0, +0.5
            const jitterPercent = jitterUnit * 18; // tweak 12–20 for spread

            const center = 50; // center of column
            const leftPercent = center + jitterPercent;

            return (
              <button
                key={dot.id}
                type="button"
                className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_6px_1px_rgba(255,255,255,0.08)] hover:scale-150 transition-transform ${dotColor(
                  dot.event.kind,
                )}`}
                style={{
                  top: `${dot.timeRatio * 100}%`,
                  left: `${leftPercent}%`,
                }}
                onMouseEnter={() => setHoveredDot(dot)}
                onMouseLeave={(e) => {
                  // only clear if we're leaving this dot's area
                  if (hoveredDot?.id === dot.id) {
                    setHoveredDot(null);
                  }
                }}
                onClick={() => onEventClick?.(dot.event)}
              />
            );
          })}

          {hoveredDot && (
            <div
              className="pointer-events-none absolute z-50 min-w-44 rounded-xl border border-white/10 
                          bg-[#0f1220]/95 backdrop-blur p-2 shadow-2xl text-xs text-white/80"
              style={{
                top: `${hoveredDot.timeRatio * 100}%`,
                // slightly to the right of center so it doesn't cover the dot
                left: "55%",
                transform: "translateY(-50%)",
              }}
            >
              <div className="mb-1 text-[11px] text-white/60">
                {kindLabel(hoveredDot.event.kind)} ·{" "}
                {formatTimeIso(hoveredDot.event.occurredAt)}
              </div>
              <div className="text-xs font-medium text-white/90 line-clamp-2">
                {hoveredDot.event.title}
              </div>
              {hoveredDot.event.subtitle && (
                <div className="mt-0.5 text-[11px] text-white/60">
                  {hoveredDot.event.subtitle}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <span className="text-[12px] mt-2 text-text-secondary">{label}</span>
    </div>
  );
}

export function OneWeekView({
  weekdayLabels,
  dotsByDay,
  hideContainer = false,
  label,
  onEventClick,
}: {
  weekdayLabels: string[];
  dotsByDay: Record<number, TimelineDot[]>;
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
          />
        ))}
      </div>
    );
  }
  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {label ? label : "Activity this week"}
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
      <div className="grid grid-cols-7 gap-5">
        {weekdayLabels.map((label, idx) => (
          <DayColumn
            key={idx}
            dayIndex={idx}
            label={label}
            dots={dotsByDay[idx] ?? []}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </section>
  );
}
