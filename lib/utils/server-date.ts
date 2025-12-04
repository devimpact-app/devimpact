export function toLocalDateServer(
  value: string | Date,
  timezone: string
): Date {
  const base = typeof value === 'string' ? new Date(value) : value;
  if (!(base instanceof Date) || isNaN(base.getTime())) return base;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(base);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');

  // Construct a Date *in UTC* representing the local wall time
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
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

/**
 * Constructs a Date at midnight in the given timezone.
 * Returns a real UTC Date representing that moment.
 */
export function makeDateAtMidnightServer(ymd: string, timezone: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const localMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const parts = dtf.formatToParts(localMidnight);

  const map: any = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  }

  return new Date(
    Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second)
  );
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

/**
 * Get the weekday (0=Monday … 6=Sunday) for a date in a specific timezone.
 */
export function getWeekdayServer(date: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });

  const wd = fmt.format(date); // "Mon", "Tue", etc.

  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  return map[wd];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfWeekServer(date: Date, timezone: string): Date {
  const ymd = formatDateServer(date, timezone);
  let cursor = makeDateAtMidnightServer(ymd, timezone);
  const weekday = getWeekdayServer(cursor, timezone); // 0 = Monday, 6 = Sunday
  const start = new Date(cursor.getTime() - weekday * DAY_MS);
  return start; // UTC Date representing Monday 00:00 in user's timezone
}

export function endOfWeekServer(date: Date, timezone: string): Date {
  const start = startOfWeekServer(date, timezone);

  const end = new Date(start.getTime() + 7 * DAY_MS - 1);

  return end;
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
