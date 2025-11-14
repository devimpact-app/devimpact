export function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
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
      d.getUTCMilliseconds(),
    ),
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
        d.getUTCMilliseconds(),
      ),
    );
    return lastDay;
  }
  return candidate;
}

export function formatSeconds(s: number | null | undefined) {
  if (s == null) return "—";
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
    month: "short",
    day: "numeric",
  });
  const ySame = start.getFullYear() === end.getFullYear();
  const y = (d: Date) =>
    new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(d);
  return ySame
    ? `${fmt.format(start)}–${fmt.format(end)}, ${y(end)}`
    : `${fmt.format(start)} ${y(start)}–${fmt.format(end)} ${y(end)}`;
}

export type TimelineRangeKey = "this_week" | "last_week" | "2w" | "4w";

export function getDefaultTimelineRange(): TimelineRangeKey {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun, 1 = Mon, ... 4 = Thu, 5 = Fri

  // If it's Thu or Fri, show "This week" by default.
  if (day === 4 || day === 5) {
    return "this_week";
  }

  // Otherwise, default to "Last week"
  return "last_week";
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

export function getTimelineRangeBounds(range: TimelineRangeKey): {
  start: Date;
  end: Date;
} {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // avoid DST weirdness a bit

  if (range === "this_week") {
    const start = startOfWeek(today);
    const end = new Date(today); // "so far" this week
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (range === "last_week") {
    const thisWeekStart = startOfWeek(today);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1); // one ms before this week
    const lastWeekStart = startOfWeek(lastWeekEnd);
    lastWeekEnd.setHours(23, 59, 59, 999);
    return { start: lastWeekStart, end: lastWeekEnd };
  }

  if (range === "2w") {
    // Start of *this* week (Monday)
    const thisWeekStart = startOfWeek(today);

    // Start of last week = thisWeekStart - 7 days
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const start = lastWeekStart;
    const end = endOfWeek(thisWeekStart); // Sunday of this week

    return { start, end };
  }

  // "4w" (28 days trailing)
  // Start of *this* week (Monday)
  const thisWeekStart = startOfWeek(today);

  // Start of last week = thisWeekStart - 7 days
  const fourWeeksStart = new Date(thisWeekStart);
  fourWeeksStart.setDate(thisWeekStart.getDate() - 21);

  const start = fourWeeksStart;
  const end = endOfWeek(thisWeekStart); // Sunday of this week

  return { start, end };
}

export function formatTimeIso(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateToDay(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
