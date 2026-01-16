import { getWeekdayIndex, toDate } from '@/lib/utils/date';
import {
  WORKDAY_END_HOUR,
  WORKDAY_SPAN_HOURS,
  WORKDAY_START_HOUR,
} from './DotLogic';

export type TimelineMeeting = {
  id: string;
  startAt: string;
  endAt: string;
  title?: string | null;
  isAllDay?: boolean;
  kind?: 'meeting' | 'ooo' | 'all_day';
};

export type TimelineBlock = {
  id: string;
  dayIndex: number; // 0-6
  startRatio: number; // 0-1
  endRatio: number; // 0-1
  laneIndex?: number;
  meeting: TimelineMeeting;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function toMeetingBlocksForWeek(
  meetings: TimelineMeeting[]
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  for (const m of meetings) {
    const start = new Date(m.startAt);
    const end = new Date(m.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const dayIndex = getWeekdayIndex(start);
    if (dayIndex < 0 || dayIndex > 6) continue;

    const s = toDate(start);
    const e = toDate(end);

    const isAllDAy = m.isAllDay;
    if (isAllDAy) {
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      while (s.getTime() < e.getTime()) {
        const dayIndex = getWeekdayIndex(s);
        if (dayIndex >= 0 && dayIndex <= 6) {
          blocks.push({
            id: `${m.id}:${s.toISOString().slice(0, 10)}`,
            dayIndex,
            startRatio: 0,
            endRatio: 1,
            meeting: { ...m, isAllDay: true },
          });
        }
        s.setDate(s.getDate() + 1);
      }
      continue;
    }

    const startHours = s.getHours() + s.getMinutes() / 60;
    const endHours = e.getHours() + e.getMinutes() / 60;

    // Clamp to workday window
    const clampedStart = clamp(
      startHours,
      WORKDAY_START_HOUR,
      WORKDAY_END_HOUR
    );
    const clampedEnd = clamp(endHours, WORKDAY_START_HOUR, WORKDAY_END_HOUR);

    // If the meeting doesn't intersect the window at all, skip it.
    if (clampedEnd <= clampedStart) continue;

    const startRatio = (clampedStart - WORKDAY_START_HOUR) / WORKDAY_SPAN_HOURS;
    const endRatio = (clampedEnd - WORKDAY_START_HOUR) / WORKDAY_SPAN_HOURS;

    blocks.push({
      id: m.id,
      dayIndex,
      startRatio,
      endRatio,
      meeting: m,
    });
  }

  return blocks;
}
