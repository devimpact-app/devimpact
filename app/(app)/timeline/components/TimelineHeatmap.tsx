"use client";

import { TimelineRangeKey } from "@/lib/utils/date";
import { OneWeekStripSkeleton } from "./OneWeekView";
import { TwoWeekSkeleton } from "./TwoWeekView";
import { FourWeekSkeleton } from "./FourWeekView";

type TimelineHeatmapProps = {
  range: TimelineRangeKey;
  start: Date;
  end: Date;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TimelineHeatmapSkeleton({
  range,
  start,
  end,
}: TimelineHeatmapProps) {
  if (range === "this_week" || range === "last_week") {
    return <OneWeekStripSkeleton weekdayLabels={WEEKDAY_LABELS} />;
  }

  if (range === "2w") {
    return <TwoWeekSkeleton weekdayLabels={WEEKDAY_LABELS} />;
  }

  return <FourWeekSkeleton start={start} end={end} />;
}
