import { endOfWeek, getDay, startOfWeek } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export function toLocalDateServer(
  value: string | Date,
  timezone: string
): Date {
  const base = typeof value === 'string' ? new Date(value) : value;
  if (!(base instanceof Date) || isNaN(base.getTime())) return base;

  const zonedDate = toZonedTime(base, timezone);
  return new Date(
    Date.UTC(
      zonedDate.getFullYear(),
      zonedDate.getMonth(),
      zonedDate.getDate(),
      zonedDate.getHours(),
      zonedDate.getMinutes(),
      zonedDate.getSeconds()
    )
  );
}

/**
 * Convert a JS Date into a YYYY-MM-DD string in a given IANA timezone.
 */
export function formatDateServer(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // returns "2025-12-04" in the target TZ
  return fmt.format(date);
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

export function getWeekdayServer(date: Date, timezone: string): number {
  const zonedDate = toZonedTime(date, timezone);
  const day = getDay(zonedDate); // 0=Sunday, 1=Monday, ...
  return day === 0 ? 6 : day - 1;
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
