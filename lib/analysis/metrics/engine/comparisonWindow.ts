import { toDate } from '@/lib/utils/date';
import { ComparisonSpec } from '../types/input';

export type ComparisonWindow =
  | { kind: 'none' }
  | {
      kind: Exclude<ComparisonSpec['kind'], 'none'>;
      start: Date;
      end: Date;
      label: string;
    };

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeComparisonWindow({
  primaryStart,
  windowWeeks,
  cmp,
}: {
  primaryStart: Date;
  windowWeeks: number;
  cmp: ComparisonSpec | undefined;
}): ComparisonWindow {
  if (!cmp || cmp.kind === 'none') return { kind: 'none' };

  const normStart = toDate(primaryStart);
  if (!normStart) return { kind: 'none' };

  switch (cmp.kind) {
    case 'previous_period': {
      const durationMs = windowWeeks * 7 * DAY_MS;

      const end = new Date(normStart.getTime()); // ends right before primaryStart
      const start = new Date(end.getTime() - durationMs);

      if (!(start < end)) return { kind: 'none' };

      return {
        kind: 'previous_period',
        start,
        end,
        label:
          windowWeeks === 1 ? 'Previous week' : `Previous ${windowWeeks} weeks`,
      };
    }

    case 'custom': {
      const start = toDate(cmp.start);
      const end = toDate(cmp.end);
      if (!start || !end || !(start < end)) return { kind: 'none' };

      return {
        kind: 'custom',
        start,
        end,
        label: 'Custom comparison',
      };
    }
  }
}
