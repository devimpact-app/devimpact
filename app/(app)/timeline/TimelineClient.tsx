"use client";

import {
  formatRange,
  getDefaultTimelineRange,
  getTimelineRangeBounds,
  TimelineRangeKey,
} from "@/lib/utils/date";
import { useEffect, useMemo, useState } from "react";
import { TimelineHero } from "./components/Hero";
import { ActivityEvent } from "@/lib/analysis/timeline/types";
import { TimelineHeatmapSkeleton } from "./components/TimelineHeatmap";

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function TimelineClient({ user }: Props) {
  const [range, setRange] = useState<TimelineRangeKey>(() =>
    getDefaultTimelineRange(),
  );
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);

  const { startISO, endISO, periodLabel } = useMemo(() => {
    const { start, end } = getTimelineRangeBounds(range);
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      periodLabel: formatRange(start, end),
    };
  }, [range]);

  useEffect(() => {
    setTimelineLoading(true);
    async function loadStory() {
      const res = await fetch(`/api/timeline?start=${startISO}&end=${endISO}`);
      const { data } = await res.json();
      setTimeline(data.events);
      setTimelineLoading(false);
    }
    loadStory();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <TimelineHero
        userName={user.name}
        range={range}
        periodLabel={periodLabel}
        onRangeChange={setRange}
      />
      <TimelineHeatmapSkeleton
        range={range}
        start={new Date(startISO)}
        end={new Date(endISO)}
      />
    </main>
  );
}
