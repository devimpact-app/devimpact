'use client';

import useSWR from 'swr';
import { WeeklySummariesSection } from './WeeklySummariesSection';
import {
  GetWeeklySummariesResponse,
  GetWeeklySummariesResponseSchema,
} from '@/types/api/weekly-summary';

async function fetchWeeklySummaries(
  limit?: number,
  oldestFirst?: boolean
): Promise<GetWeeklySummariesResponse> {
  const params = new URLSearchParams({
    ...(limit ? { limit: limit.toString() } : {}),
    ...(oldestFirst ? { oldestFirst: 'true' } : {}),
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

export default function WeeklySummariesSectionContainer({
  limit,
  oldestFirst,
  onViewAll,
  handleLoadMore,
  hideHeader,
}: {
  limit?: number;
  oldestFirst?: boolean;
  onViewAll?: () => void;
  handleLoadMore?: () => void;
  hideHeader?: boolean;
}) {
  const { data, error, isLoading } = useSWR<GetWeeklySummariesResponse>(
    ['/api/weekly-summary', limit, oldestFirst],
    ([, limit, oldestFirst]) =>
      fetchWeeklySummaries(limit as any, oldestFirst as any),
    {
      keepPreviousData: true,
    }
  );

  return (
    <WeeklySummariesSection
      items={data?.items ?? []}
      totalSummaries={data?.totalSummaries ?? 0}
      isLoading={isLoading}
      error={error?.message ?? null}
      hideHeader={hideHeader}
      onViewAll={onViewAll}
      handleLoadMore={handleLoadMore}
    />
  );
}
