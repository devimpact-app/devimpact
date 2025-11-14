"use client";

import { TimelineRangeKey } from "@/lib/utils/date";
import { OneWeekView, OneWeekSkeleton } from "./OneWeekView";
import { TwoWeekSkeleton, TwoWeekView } from "./TwoWeekView";
import { FourWeekSkeleton, FourWeekView } from "./FourWeekView";
import { TimelineDot, toDotsForWeek } from "./DotLogic";
import { ActivityEvent } from "@/types/api/timeline";
import { useMemo } from "react";

export function TimelineHeatmapLoadingSkeleton({
  range,
}: {
  range: TimelineRangeKey;
}) {
  if (range === "this_week" || range === "last_week") {
    return <OneWeekSkeleton />;
  }

  if (range === "2w") {
    return <TwoWeekSkeleton />;
  }

  return <FourWeekSkeleton />;
}

type TimelineHeatmapProps = {
  range: TimelineRangeKey;
  start: Date;
  end: Date;
  events: ActivityEvent[];
  onEventClick?: (event: ActivityEvent) => void;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  range,
  start,
  end,
  events,
  onEventClick,
}: TimelineHeatmapProps) {
  const isSingleWeek = range === "this_week" || range === "last_week";
  const isTwoWeek = range === "2w";

  // ----- SINGLE WEEK -----
  const singleWeekDots = useMemo(
    () => (isSingleWeek ? toDotsForWeek(events, start) : []),
    [events, start, isSingleWeek],
  );

  const singleWeekDotsByDay = useMemo(
    () => (isSingleWeek ? buildDotsByDay(singleWeekDots) : buildDotsByDay([])),
    [singleWeekDots, isSingleWeek],
  );

  const [week1DotsByDay, week2DotsByDay] = useMemo(() => {
    const week1Start = new Date(start);
    const week2Start = new Date(week1Start);
    week2Start.setDate(week2Start.getDate() + 7);

    const week1Dots = toDotsForWeek(events, week1Start);
    const week2Dots = toDotsForWeek(events, week2Start);

    return [buildDotsByDay(week1Dots), buildDotsByDay(week2Dots)];
  }, [events, start]);

  if (isSingleWeek) {
    return (
      <OneWeekView
        weekdayLabels={WEEKDAY_LABELS}
        dotsByDay={singleWeekDotsByDay}
        label={
          range === "this_week" ? "Activity this week" : "Activity last week"
        }
        onEventClick={onEventClick}
      />
    );
  }

  if (isTwoWeek) {
    return (
      <TwoWeekView
        weekdayLabels={WEEKDAY_LABELS}
        week1DotsByDay={week1DotsByDay}
        week2DotsByDay={week2DotsByDay}
        week1Start={start}
        week2Start={new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)}
      />
    );
  }

  return <FourWeekView start={start} end={end} events={events} />;
}
