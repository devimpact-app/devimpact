'use client';

import { useMemo } from 'react';
import WorkRhythmCard from './components/WorkRythm';
import { DashboardAlerts } from './components/DashboardAlerts';
import { UpcomingPrepCardContainer } from './components/Prep';
import WeeklySummaryDashboardCardContainer from './components/WeeklySummary';
import { ActivityLogContainer } from '@/components/activity/ActivityLogContainer';
import RecentThreadsDashboardCardContainer from './components/Threads';

type Props = {
  fullName: string;
  cliDisconnected: boolean;
  staleSyncDays: number | null;
  backfillLoading: boolean;
};

export default function DashboardClient({
  fullName,
  cliDisconnected,
  staleSyncDays,
  backfillLoading,
}: Props) {
  const firstName = useMemo(
    () => (fullName ? fullName.split(' ')[0] : 'there'),
    [fullName]
  );

  return (
    <>
      <main className="">
        <DashboardAlerts
          backfillLoading={backfillLoading}
          cliDisconnected={cliDisconnected}
          staleSyncDays={staleSyncDays}
        />
        <div className="pt-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 space-y-8 ">
          <header className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
                  Welcome, {firstName}!
                </h1>
                <p className="mt-1 text-sm text-white/60">
                  Here&apos;s what&apos;s happening with your work
                </p>
              </div>
            </div>
          </header>

          <UpcomingPrepCardContainer />

          <RecentThreadsDashboardCardContainer />

          <WeeklySummaryDashboardCardContainer />

          <WorkRhythmCard />

          <ActivityLogContainer mode="preview" />
        </div>
      </main>
    </>
  );
}
