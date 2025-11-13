"use client";

import { Calendar, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type RangeKey = "14d" | "30d" | "90d";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "14d", label: "Last 14 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
];

type Props = {
  userName?: string | null;
  periodLabel: string; // e.g. "Oct 13 – Nov 12, 2025"
  range: RangeKey;
  onRangeChange?: (range: RangeKey) => void;
  onSyncClick?: () => void;
  onPrepareReviewClick?: () => void;
};

export function DashboardHero({
  userName,
  periodLabel,
  range,
  onRangeChange,
  onSyncClick,
  onPrepareReviewClick,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const firstName = useMemo(
    () => (userName ? userName.split(" ")[0] : "there"),
    [userName],
  );

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Here&apos;s what&apos;s happening with your work{" "}
            <span className="text-text-primary/80">({periodLabel})</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-[6px] text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 text-text-secondary" />
            <select
              className="bg-transparent text-xs sm:text-sm text-text-primary outline-none border-none focus:ring-0 cursor-pointer pr-1"
              value={range}
              onChange={(e) => onRangeChange?.(e.target.value as RangeKey)}
            >
              {RANGE_OPTIONS.map((opt) => (
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

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/80 text-text-secondary hover:text-text-primary hover:bg-surface-alt/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-surface-alt/95 backdrop-blur shadow-xl text-sm py-1">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-text-primary hover:bg-background/60"
                  onClick={() => {
                    setMenuOpen(false);
                    onSyncClick?.();
                  }}
                >
                  Sync GitHub data
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-text-primary hover:bg-background/60"
                  onClick={() => {
                    setMenuOpen(false);
                    onPrepareReviewClick?.();
                  }}
                >
                  Prepare review packet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
