import { endOfDay, endOfWeek, getDay, startOfWeek } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export function getHourInTimezoneServer(
  value: Date | string,
  timezone: string
): number {
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number(formatInTimeZone(d, timezone, 'H'));
}

export function getWeekdayInTimezoneServer(
  value: Date | string,
  timezone: string
): number {
  const d = typeof value === 'string' ? new Date(value) : value;

  const isoDay = Number(formatInTimeZone(d, timezone, 'i'));

  return isoDay - 1;
}

export function getYMDInTimezoneServer(
  value: Date | string,
  timezone: string
): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return formatInTimeZone(d, timezone, 'yyyy-MM-dd');
}

export function getMDInTimezoneServer(
  value: Date | string,
  timezone: string
): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return formatInTimeZone(d, timezone, 'MM-dd');
}

export function formatRangeServer(
  start: Date,
  end: Date,
  timezone: string
): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });

  const fmtYear = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    timeZone: timezone,
  });

  const startStr = fmt.format(start);
  const endStr = fmt.format(end);

  const sameYear = fmtYear.format(start) === fmtYear.format(end);

  if (sameYear) {
    return `${startStr}–${endStr}, ${fmtYear.format(end)}`;
  }

  return `${startStr} ${fmtYear.format(start)}–${endStr} ${fmtYear.format(
    end
  )}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfWeekServer(date: Date, timezone: string): Date {
  // Convert UTC date to the user's timezone
  const zonedDate = toZonedTime(date, timezone);

  // Get start of week in that timezone (Monday midnight)
  const zonedStartOfWeek = startOfWeek(zonedDate, { weekStartsOn: 1 });

  // Convert back to UTC
  return fromZonedTime(zonedStartOfWeek, timezone);
}

export function endOfWeekServer(date: Date, timezone: string): Date {
  const zonedDate = toZonedTime(date, timezone);
  const zonedEndOfWeek = endOfWeek(zonedDate, { weekStartsOn: 1 });
  return fromZonedTime(zonedEndOfWeek, timezone);
}

export function endOfDayServer(date: Date, timezone: string) {
  const zonedDate = toZonedTime(date, timezone);
  const zonedEndOfWeek = endOfDay(zonedDate);
  return fromZonedTime(zonedEndOfWeek, timezone);
}

export function getWeekBoundsFromOffsetServer(
  weekOffset: number,
  windowWeeks: number = 1,
  timezone: string,
  today: Date = new Date()
): { start: Date; end: Date } {
  if (windowWeeks < 1) {
    throw new Error('windowWeeks must be >= 1');
  }
  const thisWeekStart = startOfWeekServer(today, timezone);
  const endWeekStart = new Date(
    thisWeekStart.getTime() + weekOffset * 7 * DAY_MS
  );

  // Oldest week included in the window
  const oldestWeekOffset = weekOffset - (windowWeeks - 1);
  const start = new Date(
    thisWeekStart.getTime() + oldestWeekOffset * 7 * DAY_MS
  );

  const end = endOfWeekServer(endWeekStart, timezone);

  return { start, end };
}
