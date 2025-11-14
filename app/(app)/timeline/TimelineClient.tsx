"use client";

import {
  formatRange,
  getDefaultTimelineRange,
  getTimelineRangeBounds,
  TimelineRangeKey,
} from "@/lib/utils/date";
import { useEffect, useMemo, useState } from "react";
import { TimelineHero } from "./components/Hero";
import {
  TimelineHeatmap,
  TimelineHeatmapLoadingSkeleton,
} from "./components/TimelineHeatmap";
import { ActivityEvent } from "@/types/api/timeline";
import { EventInspectorPanel } from "./components/EventInspectorPanel";
import { cn } from "@/lib/utils";

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function TimelineClient({ user }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(
    null,
  );

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
  }, [range]);

  const panelOpen = !!selectedEvent;

  return (
    <>
      <main
        className={cn(
          "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 transition-[padding-right] duration-200",
          panelOpen && "lg:pr-[280px]", // make room for the drawer on large screens
        )}
      >
        <TimelineHero
          userName={user.name}
          range={range}
          periodLabel={periodLabel}
          onRangeChange={setRange}
        />
        {timelineLoading ? (
          <TimelineHeatmapLoadingSkeleton range={range} />
        ) : (
          <TimelineHeatmap
            range={range}
            start={new Date(startISO)}
            end={new Date(endISO)}
            events={timeline}
            onEventClick={(event) => {
              console.log("Clicked event:", event);
              setSelectedEvent(event);
            }}
          />
        )}
      </main>
      {selectedEvent && (
        <EventInspectorPanel
          key={selectedEvent.id}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
