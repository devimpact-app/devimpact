'use client';

import { useMemo, useState } from 'react';
import {
  formatRange,
  getDefaultWeekOffset,
  getWeekBoundsFromOffset,
} from '@/lib/utils/date';

export function useWeekNavigation() {
  const [weekOffset, setWeekOffset] = useState(getDefaultWeekOffset());

  const { start, end } = useMemo(
    () => getWeekBoundsFromOffset(weekOffset),
    [weekOffset]
  );

  const label = useMemo(() => {
    if (weekOffset === 0) return 'This week';
    if (weekOffset === -1) return 'Last week';
    // For older weeks, fall back to date-based label
    return formatRange(start, end); // e.g. "Nov 3–9"
  }, [weekOffset, start, end]);

  const subLabel = useMemo(
    () => formatRange(start, end), // e.g. "Nov 3–9, 2025"
    [start, end]
  );

  const canGoForward = weekOffset < 0; // don’t go beyond this week

  function goPrevWeek() {
    setWeekOffset((w) => w - 1);
  }

  function goNextWeek() {
    setWeekOffset((w) => Math.min(0, w + 1));
  }

  return {
    weekOffset,
    start,
    end,
    label,
    subLabel,
    canGoForward,
    goPrevWeek,
    goNextWeek,
  };
}
