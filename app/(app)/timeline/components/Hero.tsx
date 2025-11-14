"use client";

import { TimelineRangeKey } from "@/lib/utils/date";
import { Calendar } from "lucide-react";
import { useMemo } from "react";

const TIMELINE_RANGE_OPTIONS: { key: TimelineRangeKey; label: string }[] = [
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "2w", label: "Last 2 weeks" },
  { key: "4w", label: "Last 4 weeks" },
];

type TimelineHeroProps = {
  userName?: string | null;
  periodLabel: string; // e.g. "Nov 10 – Nov 16, 2025"
  range: TimelineRangeKey;
  onRangeChange?: (range: TimelineRangeKey) => void;
};

export function TimelineHero({
  userName,
  periodLabel,
  range,
  onRangeChange,
}: TimelineHeroProps) {
  const firstName = useMemo(
    () => (userName ? userName.split(" ")[0] : undefined),
    [userName],
  );

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
            {firstName ? `${firstName}’s timeline` : "Your work timeline"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Explore a chronological view of your recent work{" "}
            <span className="text-text-primary/80">({periodLabel})</span>.
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Zoom in on a single week or step back to see how your patterns
            evolve.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-[6px] text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 text-text-secondary" />
            <select
              className="bg-transparent text-xs sm:text-sm text-text-primary outline-none border-none focus:ring-0 cursor-pointer pr-1"
              value={range}
              onChange={(e) =>
                onRangeChange?.(e.target.value as TimelineRangeKey)
              }
            >
              {TIMELINE_RANGE_OPTIONS.map((opt) => (
                <option
                  key={opt.key}
                  value={opt.key}
                  className="bg-[#050608] text-text-primary"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
