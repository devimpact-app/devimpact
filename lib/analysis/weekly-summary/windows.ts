import {
  getYMDInTimezoneServer,
  localDateToUtc,
  startOfWeekServer,
} from '@/lib/utils/server-date';
import { addDays, getDay, subWeeks } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function assertIsMondayLocal(dateIso: string, timezone: string) {
  const localMidnightUtc = localDateToUtc(dateIso, timezone);
  const zoned = toZonedTime(localMidnightUtc, timezone);
  if (getDay(zoned) !== 1) {
    throw new Error(
      `dateIso must be a Monday in timezone ${timezone}. Got ${dateIso} (${zoned.toDateString()})`
    );
  }
}

export function getWeekWindowIso({
  dateIso,
  timezone,
}: {
  dateIso: string; // YYYY-MM-DD (local date in user's timezone)
  timezone: string;
}): {
  weekStart: Date;
  weekEnd: Date;
  weekStartLocalDate: string; // YYYY-MM-DD (Monday in user's TZ)
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`Invalid YYYY-MM-DD dateIso: ${dateIso}`);
  }

  assertIsMondayLocal(dateIso, timezone);

  const localMidnightUtc = localDateToUtc(dateIso, timezone);
  const weekStart = startOfWeekServer(localMidnightUtc, timezone);
  const weekEnd = addDays(weekStart, 7);
  return {
    weekStart,
    weekEnd,
    weekStartLocalDate: dateIso,
  };
}

export function getMostRecentlyCompletedWeekWindowIso({
  timezone,
  now = new Date(),
}: {
  timezone: string;
  now?: Date;
}): {
  weekStart: Date;
  weekEnd: Date;
  weekStartLocalDate: string; // YYYY-MM-DD (Monday in user's TZ)
} {
  const currentWeekStartUtc = startOfWeekServer(now, timezone);
  const weekStartUtc = subWeeks(currentWeekStartUtc, 1);
  const weekEndUtc = currentWeekStartUtc;
  const weekStartLocalDate = getYMDInTimezoneServer(weekStartUtc, timezone);

  return {
    weekStart: weekStartUtc,
    weekEnd: weekEndUtc,
    weekStartLocalDate,
  };
}
