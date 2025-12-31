export function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

export function formatDateTime(iso: string | Date | null) {
  if (!iso) return null;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatDateOnly(iso: string | Date | null) {
  if (!iso) return null;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatUpcomingTime(startIso: string) {
  const d = new Date(startIso);
  const now = new Date();
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);

  if (diffMin >= 0 && diffMin < 60) return `In ${diffMin} min`;
  if (diffMin >= 60 && diffMin < 24 * 60) {
    const hrs = Math.round(diffMin / 60);
    return `In ${hrs} hr${hrs === 1 ? '' : 's'}`;
  }

  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getWeekdayIndex(value: string | Date): number {
  const jsDay = toDate(value).getDay(); // 0–6
  return (jsDay + 6) % 7;
}

export function weeksAgo(start: Date, weeks: number): Date {
  const d = new Date(start);
  d.setDate(d.getDate() - weeks * 7);
  return d;
}

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

export function daysAgo(start: Date, days: number): Date {
  const d = new Date(start);
  d.setDate(d.getDate() - days);
  return d;
}

export function minutesBetween(start: Date | null, end: Date | null) {
  if (!start || !end) return null;
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms)) return null;
  const mins = Math.round(ms / 60000);
  return mins >= 0 ? mins : null;
}

export function hoursSince(a?: Date | null, now = new Date()) {
  if (!a) return Number.POSITIVE_INFINITY;
  return (now.getTime() - a.getTime()) / (60 * 60 * 1000);
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
  const idx = getWeekdayIndex(today); // 0 = Sun, 1 = Mon, ... 4 = Thu, 5 = Fri

  // If it's Wed+, show "This week" by default.
  if (idx >= 2) {
    return 0;
  }

  // Otherwise, default to "Last week"
  return -1;
}

// Monday = 1, Sunday = 0 → convert to Monday=0
export function startOfWeek(date: Date): Date {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (day + 6) % 7;

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

export function getDaysDiff(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  return days;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeWindowEnd(start: Date, windowWeeks: number): Date {
  const duration = windowWeeks * 7 * DAY_MS;
  return new Date(start.getTime() + duration);
}

export function formatHours(hours: number | null): string {
  if (hours == null) return '—';
  if (hours < 1) return `${(hours * 60).toFixed(0)}m`;
  return `${hours.toFixed(1)}h`;
}

export function formatMinutes(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

export function getTimezone(): string {
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';
  return timezone;
}

export function nextHalfHourBoundary(now: Date) {
  const d = new Date(now);
  d.setSeconds(0, 0);

  const minutes = d.getMinutes();
  const remainder = minutes % 30;

  const addMinutes = remainder === 0 ? 30 : 30 - remainder;
  d.setMinutes(minutes + addMinutes);
  return d;
}
