import {
  collectRunsBySlice,
  pickTopNonOverlapping,
  windowsFromRuns,
} from './runs';
import { labelForWindow } from './timeSlices';
import type { TimeSlice } from '../types';
import type { ProtectWindow } from '@/types/api/work-rhythm';
import { getHourInTimezoneServer } from '@/lib/utils/server-date';
import type { WindowStats } from '../types';
import { WORKDAY_END_HOUR, WORKDAY_START_HOUR } from './labels';

function scoreProtectWindow(w: WindowStats) {
  const reasons: string[] = [];

  const utilized = w.workEventCount > 0 || w.workSlices > 0;
  const workDensity = w.workSlices / Math.max(1, w.sliceCount);

  // Prefer: meeting-free, used, decent length, some density.
  let score =
    (w.durationMinutes / 60) * 0.9 + // length matters, but not everything
    w.workEventCount * 0.6 +
    w.workSlices * 0.25 +
    workDensity * 1.5;

  if (utilized) reasons.push('historically_used');
  else reasons.push('available');

  if (w.durationMinutes >= 120) reasons.push('long_block');
  if (workDensity >= 0.25) reasons.push('steady_work_signal');

  // Avoid suggesting totally empty windows as “protect” (still allow as fallback)
  if (!utilized && w.durationMinutes < 90) score -= 0.75;

  return { score, reasons };
}

function isWorkdaySlice(s: TimeSlice, tz: string) {
  const h = getHourInTimezoneServer(s.startUtc, tz);
  return h >= WORKDAY_START_HOUR && h < WORKDAY_END_HOUR;
}

const PROTECT_MIN_MINUTES = 60;
const PROTECT_MAX_MINUTES = 120;

export function findProtectWindows(params: {
  slices: TimeSlice[];
  timezone: string;
  limit?: number;
}): ProtectWindow[] {
  const { slices, timezone, limit = 3 } = params;
  if (!slices.length) return [];

  const runs = collectRunsBySlice(
    slices,
    (s) => !s.hasMeeting && isWorkdaySlice(s, timezone)
  );

  const windows = windowsFromRuns({
    slices,
    runs,
    minWindowMinutes: PROTECT_MIN_MINUTES,
    maxWindowMinutes: PROTECT_MAX_MINUTES,
    scoreWindow: scoreProtectWindow,
  });

  // Keep it simple: only meaningful candidates
  const filtered = windows
    .filter((w) => w.durationMinutes >= PROTECT_MIN_MINUTES)
    .filter((w) => w.score > 0);

  const picked = pickTopNonOverlapping(filtered, limit, { padMinutes: 15 });

  return picked.map((w) => ({
    startUtc: w.startUtc.toISOString(),
    endUtc: w.endUtc.toISOString(),
    durationMinutes: w.durationMinutes,
    label: labelForWindow(w.startUtc, w.endUtc, timezone),

    score: w.score,
    reasons: w.reasons,

    workEventCount: w.workEventCount,
    workSlices: w.workSlices,
    totalSlices: w.sliceCount,
  }));
}
