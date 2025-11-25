'use client';

import useSWR from 'swr';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { WeeklySummary, WeeklySummarySchema } from '@/types/api/weekly-summary';

async function fetchWeeklySummary(
  start: string,
  end: string,
  timezone: string
): Promise<WeeklySummary> {
  const params = new URLSearchParams({
    start,
    end,
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
  startISO,
  endISO,
}: {
  startISO: string;
  endISO: string;
}) {
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';

  const { data, error, isLoading } = useSWR<WeeklySummary>(
    ['/api/weekly-summary', startISO, endISO, timezone],
    ([, start, end, tz]) =>
      fetchWeeklySummary(start as string, end as string, tz as string)
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
