import {
  collectRunsBySlice,
  pickTopNonOverlapping,
  windowsFromRuns,
} from './runs';
import { TimeSlice, WindowStats } from './types';
import { labelForWindow } from './timeSlices';
import { getHourInTimezoneServer } from '@/lib/utils/server-date';
import { DeepWorkBlock } from '@/types/api/work-rhythm';
import { WORKDAY_END_HOUR, WORKDAY_START_HOUR } from './labels';

function isWorkdaySlice(s: TimeSlice, tz: string) {
  const h = getHourInTimezoneServer(s.startUtc, tz);
  return h >= WORKDAY_START_HOUR && h < WORKDAY_END_HOUR;
}

const DEEP_MIN_MINUTES = 90;
const DEEP_MAX_MINUTES = 180;

function scoreDeepBlock(w: WindowStats) {
  const reasons: string[] = [];

  // For deep work, meetingShare should be 0 by construction.
  // Prefer longer blocks; slight bonus if actually used.
  const durationScore = w.durationMinutes / 60; // 1.5..3
  const utilized = w.workEventCount > 0 || w.workSlices > 0;

  let score = durationScore;
  if (utilized) {
    score += 0.5;
    reasons.push('utilized');
  } else {
    reasons.push('available');
  }

  return { score, reasons };
}

export function findDeepWorkBlocks(params: {
  slices: TimeSlice[];
  timezone: string;
  limit?: number;
}): DeepWorkBlock[] {
  const { slices, timezone, limit = 3 } = params;

  if (!slices.length) return [];

  const runs = collectRunsBySlice(
    slices,
    (s) => !s.hasMeeting && isWorkdaySlice(s, timezone)
  );
  const windows = windowsFromRuns({
    slices,
    runs,
    minWindowMinutes: DEEP_MIN_MINUTES,
    maxWindowMinutes: DEEP_MAX_MINUTES,
    scoreWindow: scoreDeepBlock,
  });

  const filtered = windows.filter((w) => w.durationMinutes >= DEEP_MIN_MINUTES);

  const picked = pickTopNonOverlapping(filtered, limit, { padMinutes: 15 });

  return picked.map((w) => ({
    startUtc: w.startUtc.toISOString(),
    endUtc: w.endUtc.toISOString(),
    durationMinutes: w.durationMinutes,
    label: labelForWindow(w.startUtc, w.endUtc, timezone),

    isUtilized: w.workEventCount > 0 || w.workSlices > 0,
    workEventCount: w.workEventCount,
    workSlices: w.workSlices,
    totalSlices: w.sliceCount,
    reasons: w.reasons,
  }));
}
