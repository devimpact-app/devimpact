export function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

export function toLocalDate(value: string | Date, timezone: string): Date {
  const base = typeof value === 'string' ? new Date(value) : value;

  // Safety: handle invalid dates defensively
  if (!(base instanceof Date) || isNaN(base.getTime())) {
    return base;
  }

  // Convert UTC → local timezone using locale string
  return new Date(base.toLocaleString('en-US', { timeZone: timezone }));
}

export function getLocalWeekdayIndex(
  value: string | Date,
  timezone: string
): number {
  const local = toLocalDate(value, timezone);
  const jsDay = local.getDay(); // 0–6
  return (jsDay + 6) % 7;
}

/**
 * Shift a date by N years while trying to preserve month/day.
 * Handles leap days by clamping to the last day of Feb when needed.
 */
export function shiftYear(d: Date, deltaYears: number): Date {
  const y = d.getUTCFullYear() + deltaYears;
  const m = d.getUTCMonth(); // 0-11
  const day = d.getUTCDate();

  // Create with UTC components to avoid TZ drift.
  const candidate = new Date(
    Date.UTC(
      y,
      m,
      day,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  );

  // If month overflowed (e.g., Feb 29 → Mar 1), clamp to last day of target month.
  if (candidate.getUTCMonth() !== m) {
    // set to day 0 of next month = last day of current target month
    const lastDay = new Date(
      Date.UTC(
        y,
        m + 1,
        0,
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds()
      )
    );
    return lastDay;
  }
  return candidate;
}

export function formatSeconds(s: number | null | undefined) {
  if (s == null) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

export function formatRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const ySame = start.getFullYear() === end.getFullYear();
  const y = (d: Date) =>
    new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(d);
  return ySame
    ? `${fmt.format(start)}–${fmt.format(end)}, ${y(end)}`
    : `${fmt.format(start)} ${y(start)}–${fmt.format(end)} ${y(end)}`;
}

export function getDefaultWeekOffset(): number {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun, 1 = Mon, ... 4 = Thu, 5 = Fri

  // If it's Thu or Fri, show "This week" by default.
  if (day === 4 || day === 5) {
    return 0;
  }

  // Otherwise, default to "Last week"
  return -1;
}

export function startOfWeek(date: Date): Date {
  // Treat Monday as the first day of week
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (day + 6) % 7; // 0 if Mon, 1 if Tue, ..., 6 if Sun
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getWeekBoundsFromOffset(
  weekOffset: number,
  windowWeeks: number = 1,
  today: Date = new Date()
): { start: Date; end: Date } {
  if (windowWeeks < 1) {
    throw new Error('windowWeeks must be >= 1');
  }

  // Start of *this* week (e.g. Monday)
  const thisWeekStart = startOfWeek(today);

  // The week we want the range to END on
  const endWeekStart = new Date(thisWeekStart);
  endWeekStart.setDate(thisWeekStart.getDate() + weekOffset * 7);

  // Oldest week included in the window
  const oldestWeekOffset = weekOffset - (windowWeeks - 1);
  const start = new Date(thisWeekStart);
  start.setDate(thisWeekStart.getDate() + oldestWeekOffset * 7);

  // End at the end of the end-week
  const end = endOfWeek(endWeekStart);

  return { start, end };
}

export function formatTimeIso(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateToDay(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
