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
