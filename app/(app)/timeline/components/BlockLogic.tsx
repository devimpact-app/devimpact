import { getWeekdayIndex, toDate } from '@/lib/utils/date';

export type TimelineMeeting = {
  id: string;
  startAt: string;
  endAt: string;
  title?: string | null;
};

export type TimelineBlock = {
  id: string;
  dayIndex: number; // 0-6
  startRatio: number; // 0-1
  endRatio: number; // 0-1
  laneIndex?: number;
  meeting: TimelineMeeting;
};

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

    const startHours = s.getHours() + s.getMinutes() / 60;
    const endHours = e.getHours() + e.getMinutes() / 60;

    const startRatio = Math.max(0, Math.min(1, startHours / 24));
    const endRatio = Math.max(startRatio, Math.min(1, endHours / 24));

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
