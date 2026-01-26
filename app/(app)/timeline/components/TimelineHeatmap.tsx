'use client';

import { OneWeekView } from './OneWeekView';
import { toDotsForWeek } from './DotLogic';
import { ActivityEvent } from '@/types/api/timeline';
import { useMemo } from 'react';
import { toMeetingBlocksForWeek } from './BlockLogic';
import { is } from 'drizzle-orm';

type TimelineHeatmapProps = {
  events: ActivityEvent[];
  onEventClick?: (event: ActivityEvent) => void;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildByDay<T extends { dayIndex: number }>(
  items: T[]
): Record<number, T[]> {
  const map: Record<number, T[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const item of items) {
    map[item.dayIndex].push(item);
  }
  return map;
}

export function TimelineHeatmap({
  events,
  onEventClick,
}: TimelineHeatmapProps) {
  const { meetings, nonMeetings } = useMemo(() => {
    const meetings = events
      .filter((ev) => ev.kind === 'meeting')
      .map((ev) => ({
        id: ev.id,
        startAt: ev.occurredAt,
        endAt: ev.meta?.endAt || ev.occurredAt,
        title: ev.meta?.eventTitle || 'Meeting',
        isAllDay: ev.meta?.isAllDay || false,
        kind: ev.meta?.meetingKind || 'meeting',
        event: ev,
      }));
    const nonMeetings = events.filter((ev) => ev.kind !== 'meeting');
    return { meetings, nonMeetings };
  }, [events]);
  const singleWeekDots = useMemo(
    () => toDotsForWeek(nonMeetings),
    [nonMeetings]
  );

  const singleWeekDotsByDay = useMemo(
    () => buildByDay(singleWeekDots),
    [singleWeekDots]
  );

  const blocksByDay = useMemo(() => {
    const blocks = toMeetingBlocksForWeek(meetings);
    return buildByDay(blocks);
  }, [meetings]);

  return (
    <OneWeekView
      weekdayLabels={WEEKDAY_LABELS}
      dotsByDay={singleWeekDotsByDay}
      blocksByDay={blocksByDay}
      label={'Timeline'}
      onEventClick={onEventClick}
    />
  );
}
