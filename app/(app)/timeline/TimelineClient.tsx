'use client';

import { useEffect, useMemo, useState } from 'react';
import { TimelineHeatmap } from './components/TimelineHeatmap';
import { ActivityEvent } from '@/types/api/timeline';
import { EventInspectorPanel } from './components/EventInspectorPanel';
import { cn } from '@/lib/utils';
import { ActivityLogContainer } from '@/components/activity/ActivityLogContainer';
import { useWeekNavigation } from '@/components/dates/useWeekNavigation';
import { WeekNavigator } from '@/components/dates/WeekPicker';
import { OneWeekSkeleton } from './components/OneWeekView';
import { getTimezone } from '@/lib/utils/date';

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
    null
  );
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);

  const { start, end, subLabel, label, canGoForward, goPrevWeek, goNextWeek } =
    useWeekNavigation();

  const { startISO, endISO } = useMemo(() => {
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    };
  }, [start, end]);

  useEffect(() => {
    setTimelineLoading(true);
    async function loadStory() {
      const res = await fetch(
        `/api/activity?start=${startISO}&end=${endISO}&includeMeetings=true`
      );
      const { data } = await res.json();
      setTimeline(data.events);
      setTimelineLoading(false);
    }
    loadStory();
  }, [startISO, endISO]);

  const panelOpen = !!selectedEvent;

  const firstName = useMemo(
    () => (user.name ? user.name.split(' ')[0] : undefined),
    [user.name]
  );

  return (
    <>
      <main
        className={cn(
          'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 transition-[padding-right] duration-200',
          panelOpen && 'lg:pr-[280px]' // make room for the drawer on large screens
        )}
      >
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
                {firstName ? `${firstName}’s timeline` : 'Your work timeline'}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Explore a chronological view of your recent work{' '}
                <span className="text-text-primary/80">({subLabel})</span>.
              </p>
            </div>
            <WeekNavigator
              label={label}
              subLabel={subLabel}
              canGoForward={canGoForward}
              onPrevWeek={goPrevWeek}
              onNextWeek={goNextWeek}
            />
          </div>
        </header>
        {timelineLoading ? (
          <OneWeekSkeleton />
        ) : (
          <TimelineHeatmap
            events={timeline}
            onEventClick={(event) => {
              setSelectedEvent(event);
            }}
          />
        )}

        <ActivityLogContainer
          mode="full"
          startISO={startISO}
          endISO={endISO}
          onEventClick={(event) => {
            setSelectedEvent(event);
          }}
        />
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
