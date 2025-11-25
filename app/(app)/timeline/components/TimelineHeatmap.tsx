'use client';

import { OneWeekView } from './OneWeekView';
import { TimelineDot, toDotsForWeek } from './DotLogic';
import { ActivityEvent } from '@/types/api/timeline';
import { useMemo } from 'react';

type TimelineHeatmapProps = {
  timezone: string;
  events: ActivityEvent[];
  onEventClick?: (event: ActivityEvent) => void;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildDotsByDay(dots: TimelineDot[]): Record<number, TimelineDot[]> {
  const map: Record<number, TimelineDot[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const dot of dots) {
    map[dot.dayIndex].push(dot);
  }
  return map;
}

export function TimelineHeatmap({
  timezone,
  events,
  onEventClick,
}: TimelineHeatmapProps) {
  const singleWeekDots = useMemo(
    () => toDotsForWeek(events, timezone),
    [events, timezone]
  );

  const singleWeekDotsByDay = useMemo(
    () => buildDotsByDay(singleWeekDots),
    [singleWeekDots]
  );

  return (
    <OneWeekView
      weekdayLabels={WEEKDAY_LABELS}
      dotsByDay={singleWeekDotsByDay}
      label={'test'}
      onEventClick={onEventClick}
    />
  );
}
