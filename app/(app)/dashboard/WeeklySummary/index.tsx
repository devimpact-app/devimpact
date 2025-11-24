'use client';

import useSWR from 'swr';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { WeeklySummary, WeeklySummarySchema } from '@/types/api/weekly-summary';
import { TimelineRangeKey } from '@/types/api/http';

async function fetchWeeklySummary(
  rangeKey: string,
  timezone: string
): Promise<WeeklySummary> {
  const params = new URLSearchParams({
    rangeKey,
    timezone,
  });

  const res = await fetch(`/api/weekly-summary?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load weekly summary');
  }

  const { data } = await res.json();
  return WeeklySummarySchema.parse(data);
}

export default function WeeklySummaryCardContainer({
  rangeKey,
}: {
  rangeKey: TimelineRangeKey;
}) {
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';

  const { data, error, isLoading } = useSWR<WeeklySummary>(
    ['/api/weekly-summary', rangeKey, timezone],
    ([, rk, tz]) => fetchWeeklySummary(rk as string, tz as string)
  );

  return (
    <WeeklySummaryCard
      summary={data}
      isLoading={isLoading}
      error={error?.message ?? null}
      onOpenOneOnOne={() => {}}
    />
  );
}
