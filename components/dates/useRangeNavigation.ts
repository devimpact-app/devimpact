'use client';

import { useMemo, useState } from 'react';
import { formatRange, getWeekBoundsFromOffset } from '@/lib/utils/date';
import { RangeValue } from './RangePicker';

function weeksForRange(value: RangeValue): number {
  switch (value) {
    case '4w':
      return 4;
    case '8w':
      return 8;
    case '12w':
    default:
      return 12;
  }
}

export function useRange() {
  const [range, setRange] = useState<RangeValue>('4w');

  const { start, end } = useMemo(
    () => getWeekBoundsFromOffset(0, weeksForRange(range)),
    [range]
  );

  const label = useMemo(() => {
    switch (range) {
      case '4w':
        return 'Last 4 weeks';
      case '8w':
        return 'Last 8 weeks';
      case '12w':
        return 'Last 12 weeks';
      default:
        return 'Last 4 weeks';
    }
  }, [range]);

  const subLabel = useMemo(() => formatRange(start, end), [start, end]);

  return {
    range,
    setRange,
    start,
    end,
    label,
    subLabel,
  };
}
