'use client';

import { TimelineRangeKey } from '@/lib/utils/date';
import { Calendar, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const TIMELINE_RANGE_OPTIONS: { key: TimelineRangeKey; label: string }[] = [
  { key: 'this_week', label: 'This week' },
  { key: 'last_week', label: 'Last week' },
  { key: '2w', label: 'Last 2 weeks' },
  { key: '4w', label: 'Last 4 weeks' },
];

type Props = {
  userName?: string | null;
  periodLabel: string; // e.g. "Oct 13 – Nov 12, 2025"
  range: TimelineRangeKey;
  onRangeChange?: (range: TimelineRangeKey) => void;
  onSyncClick?: () => void;
  onPrepareReviewClick?: () => void;
};

export function DashboardHero({
  userName,
  periodLabel,
  range,
  onRangeChange,
}: Props) {
  const firstName = useMemo(
    () => (userName ? userName.split(' ')[0] : 'there'),
    [userName]
  );

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Here&apos;s what&apos;s happening with your work{' '}
            <span className="text-text-primary/80">({periodLabel})</span>.
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
