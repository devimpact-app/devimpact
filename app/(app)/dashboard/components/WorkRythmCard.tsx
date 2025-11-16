"use client";

import { WEEKDAY_LABELS } from "@/lib/utils/date";
import { ActivityEvent } from "@/types/api/timeline";
import { ChevronRight, BarChart3 } from "lucide-react";
import { useMemo } from "react";

type WorkRhythmCardProps = {
  events: ActivityEvent[];
  loading?: boolean;
  rangeDays: 7 | 14 | 30;
  onViewTimelineClick?: () => void;
};

// 4 time bands: early, morning, afternoon, evening
const TIME_BANDS = 4;
const DAY_COLUMNS = 7;

// Map JS getDay (0=Sun) → Monday=0..Sunday=6
function getDayIndex(date: Date): number {
  const jsDay = date.getDay(); // 0–6 (Sun–Sat)
  return (jsDay + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
}

function getTimeBand(date: Date): number {
  const hour = date.getHours();
  if (hour < 6) return 0; // early
  if (hour < 12) return 1; // morning
  if (hour < 18) return 2; // afternoon
  return 3; // evening
}

function lerpColor(c1: string, c2: string, t: number) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);

  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export function WorkRhythmCard({
  events,
  loading,
  rangeDays,
  onViewTimelineClick,
}: WorkRhythmCardProps) {
  const { grid, maxCount } = useMemo(() => {
    const base: number[][] = Array.from({ length: TIME_BANDS }, () =>
      Array.from({ length: DAY_COLUMNS }, () => 0),
    );

    for (const ev of events) {
      const d = new Date(ev.occurredAt);
      if (Number.isNaN(d.getTime())) continue;

      const dayIdx = getDayIndex(d); // 0–6
      const bandIdx = getTimeBand(d); // 0–3

      if (
        dayIdx >= 0 &&
        dayIdx < DAY_COLUMNS &&
        bandIdx >= 0 &&
        bandIdx < TIME_BANDS
      ) {
        base[bandIdx][dayIdx] += 1;
      }
    }

    let max = 0;
    for (const row of base) {
      for (const val of row) {
        if (val > max) max = val;
      }
    }

    return { grid: base, maxCount: max };
  }, [events]);

  const windowLabel =
    rangeDays === 7 ? "the last week" : `the last ${rangeDays} days`;

  return (
    <section
      className="
        rounded-2xl border border-white/10 
        bg-[#111520] 
        px-5 py-4 
        flex flex-col gap-4 
        w-full
      "
    >
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="
              h-7 w-7 flex items-center justify-center 
              rounded-lg bg-[#181E2A] border border-white/10
            "
          >
            <BarChart3 className="h-4 w-4 text-white/70" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-white/90 tracking-tight">
              Your Work Rhythm
            </h3>
            <span className="text-[11px] text-white/45">
              Typical weekly pattern based on {windowLabel}.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewTimelineClick}
          className="
            text-[11px] text-[#7EA6F8] 
            hover:underline inline-flex items-center gap-1
          "
        >
          View timeline
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Heatmap */}
      <div className="relative flex flex-col gap-2">
        <div
          className="
          w-full h-24 
          rounded-xl 
          border border-white/5 
          bg-[#0C101A]
          overflow-hidden 
          relative
        "
        >
          {/* subtle guide lines */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />
          </div>

          {/* 4×7 grid of cells */}
          <div className="absolute inset-1 flex">
            <div className="flex flex-col justify-between mr-1">
              {["Early", "AM", "PM", "Eve"].map((t) => (
                <span
                  key={t}
                  className="text-[9px] text-white/30 leading-none translate-y-1"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex-1 grid grid-rows-4 grid-cols-7 gap-[4px]">
              {grid.map((row, bandIdx) =>
                row.map((count, dayIdx) => {
                  const isEmpty = maxCount === 0 || count === 0;
                  const ratio = !maxCount || count === 0 ? 0 : count / maxCount;

                  const ZERO_COLOR = "#1A1D2A"; // no activity

                  const fill =
                    ratio === 0
                      ? ZERO_COLOR
                      : lerpColor("#4A4F73", "#34D1C6", ratio);
                  const border = lerpColor("#5E668A", "#59F2DD", ratio);
                  const glow =
                    ratio > 0.75 ? "0 0 8px rgba(52, 209, 198, 0.3)" : "none";
                  return (
                    <div
                      key={`${bandIdx}-${dayIdx}`}
                      className="
            rounded-full 
            transition-transform transition-colors duration-150 
            hover:scale-[1.03]
          "
                      style={{
                        backgroundColor: fill,
                        border: border,
                        boxShadow: glow,
                      }}
                    />
                  );
                }),
              )}
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-[#0C101A]/60 flex items-center justify-center">
              <div className="h-6 w-24 rounded-full bg-[#141A26] animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex justify-between px-1">
          {WEEKDAY_LABELS.map((day) => (
            <span
              key={day}
              className="w-[12%] text-[10px] text-white/45 text-center"
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {/* Explanatory line */}
        <p className="text-[11px] text-[#7C86A8] leading-normal">
          We aggregate your coding and review activity into a typical week so
          you can spot when your focus time naturally happens.
        </p>

        {/* Narrative summary */}
        <p className="text-xs text-[#C7D2FF] leading-relaxed">
          You tend to do your heaviest coding early in the week, with most
          activity landing on
          <span className="font-medium"> Tuesday between 9–11 AM</span>. You
          also average
          <span className="font-medium"> 3 deep-work blocks per week</span>, and
          only about
          <span className="font-medium"> 15% occurs in the evening</span>. This
          is a strong window to protect for focused work.
        </p>

        {/* Optional suggestion pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full border border-[#3B4A78] px-2.5 py-1 text-[11px] text-[#C7D2FF]">
            Protect 9–11 AM on Tuesdays
          </span>
          <span className="rounded-full border border-[#3B4A78] px-2.5 py-1 text-[11px] text-[#C7D2FF]">
            Shift 1:1s out of peak hours
          </span>
        </div>
      </div>
    </section>
  );
}
