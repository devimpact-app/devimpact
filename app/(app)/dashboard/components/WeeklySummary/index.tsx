'use client';

import useSWR from 'swr';
import {
  GetWeeklySummariesResponse,
  GetWeeklySummariesResponseSchema,
} from '@/types/api/weekly-summary';
import { WeeklySummaryDashboardCard } from './WeeklySummaryDashboardCard';

async function fetchLatestWeeklySummary(): Promise<GetWeeklySummariesResponse> {
  const params = new URLSearchParams({
    limit: '1',
  });

  const res = await fetch(`/api/weekly-summary?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load weekly summaries');
  }

  const { data } = await res.json();
  return GetWeeklySummariesResponseSchema.parse(data);
}

export default function WeeklySummaryDashboardCardContainer({
  onViewAll,
}: {
  onViewAll?: () => void;
}) {
  const { data, error, isLoading } = useSWR<GetWeeklySummariesResponse>(
    ['/api/weekly-summary', '1'],
    ([,]) => fetchLatestWeeklySummary()
  );

  return (
    <WeeklySummaryDashboardCard
      summary={data?.items[0] ?? null}
      isLoading={isLoading}
      error={error?.message ?? null}
    />
  );
}
