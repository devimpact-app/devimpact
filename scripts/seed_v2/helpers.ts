import { startOfWeek } from '@/lib/utils/date';
import { addDays, subWeeks } from 'date-fns';

export type SeedTimeContext = {
  now: Date;
  currentWeekMonday: Date; // Monday 00:00 local time
  startMonday: Date; // oldest Monday (dayIndex 0)
};

export function buildSeedTimeContext(now = new Date()): SeedTimeContext {
  const currentWeekMonday = startOfWeek(now);
  const startMonday = subWeeks(currentWeekMonday, 12); // 84 days back
  return { now, currentWeekMonday, startMonday };
}

export function dateForDayIndex(
  ctx: SeedTimeContext,
  dayIndex: number,
  timeHHmm: string
) {
  const [hh, mm] = timeHHmm.split(':').map((n) => Number(n));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    throw new Error(`Invalid time: "${timeHHmm}"`);
  }

  const d = addDays(ctx.startMonday, dayIndex);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function isWeekendDayIndex(dayIndex: number) {
  // dayIndex 0 is Monday => weekend are 5 (Sat) and 6 (Sun)
  const dow = dayIndex % 7;
  return dow === 5 || dow === 6;
}
