'use client';

import useSWR from 'swr';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { WeeklySummary, WeeklySummarySchema } from '@/types/api/weekly-summary';

async function fetchWeeklySummary(rangeKey: string): Promise<WeeklySummary> {
  const res = await fetch(`/api/weekly-summary?range=${rangeKey}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load weekly summary');
  }

  const json = await res.json();
  return WeeklySummarySchema.parse(json);
}

export default function WeeklySummaryCardContainer({
  rangeKey = 'last-week',
}: {
  rangeKey?: 'this-week' | 'last-week' | 'custom';
}) {
  const { data, error, isLoading } = useSWR<WeeklySummary>(
    ['/api/weekly-summary', rangeKey],
    ([, rk]) => fetchWeeklySummary(rk as any)
  );

  return (
    <WeeklySummaryCard
      summary={data}
      isLoading={isLoading}
      error={error?.message ?? null}
      onOpenOneOnOne={() => {
        // wire to your router / 1:1 prep page
        // e.g. router.push("/one-on-ones?range=last-week")
      }}
    />
  );
}
