'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  StoryCardSkeleton,
  StoryCardView,
} from '@/components/stories/StoryCardView';
import WeeklySummaryCard from './WeeklySummary';
import WorkRhythmCard from './WorkRythm';
import { ActivityLogContainer } from '@/components/activity/ActivityLogContainer';
import { useWeekNavigation } from '@/components/dates/useWeekNavigation';
import { WeekNavigator } from '@/components/dates/WeekPicker';

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function DashboardClient({ user }: Props) {
  const [error, setError] = useState<string | null>(null);

  const [loadingStories, setLoadingStories] = useState(false);

  const [story1, setStory1] = useState<any | null>(null);
  const [story2, setStory2] = useState<any | null>(null);
  const [story3, setStory3] = useState<any | null>(null);

  const { start, end, subLabel, label, canGoForward, goPrevWeek, goNextWeek } =
    useWeekNavigation();

  const startISO = start.toISOString();
  const endISO = end.toISOString();

  useEffect(() => {
    setLoadingStories(true);
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingStories(true);
      async function loadStory() {
        const res = await fetch(
          `/api/stories/query?start=${startISO}&end=${endISO}&id=invisible_load.v1&id=collaboration_patterns.v1`
        );
        const { data } = await res.json();
        setStory1(data.stories[0]);
        setStory2(data.stories[1]);
        setLoadingStories(false);
      }
      loadStory();
    })();
  }, [startISO, endISO]);

  const firstName = useMemo(
    () => (user.name ? user.name.split(' ')[0] : 'there'),
    [user.name]
  );

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Here&apos;s what&apos;s happening with your work{' '}
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

      <WeeklySummaryCard startISO={startISO} endISO={endISO} />

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Hightlights from {subLabel}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {!loadingStories && story1 ? (
            <StoryCardView story={story1} />
          ) : (
            <StoryCardSkeleton />
          )}
          {!loadingStories && story2 ? (
            <StoryCardView story={story2} />
          ) : (
            <StoryCardSkeleton />
          )}
          {/* {!loadingStories && story3 ? (
            <StoryCardView story={story3} />
          ) : (
            <StoryCardSkeleton />
          )} */}
        </div>
      </div>

      <WorkRhythmCard />

      <ActivityLogContainer
        startISO={startISO}
        endISO={endISO}
        mode="preview"
        onViewAllClick={() => {}}
      />

      <section className="mt-6">
        <div
          className="
      rounded-2xl border border-[#252B3F] bg-[#090D16]
      px-4 py-3 sm:px-5 sm:py-4
      flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
    "
        >
          <div>
            <h3 className="text-xs font-semibold text-[#E2E6FF] mb-1">
              Turn this week into a clean 1:1
            </h3>
            <p className="text-[11px] text-[#9AA4C6] leading-snug max-w-md">
              Pull in recent wins, questions, and blockers into a single view
              you can share or use as your own notes before your next 1:1.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {}}
            className="
        inline-flex items-center gap-1.5
        rounded-full bg-[#1D283A]
        border border-[#3B4A78]
        px-3.5 py-1.5
        text-[11px] font-medium text-[#D5E0FF]
        hover:bg-[#233047] hover:border-[#4C5FA0]
        transition-colors
      "
          >
            Prep for 1:1
          </button>
        </div>
      </section>
    </main>
  );
}
