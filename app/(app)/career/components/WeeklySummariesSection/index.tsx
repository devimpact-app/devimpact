'use client';

import useSWR from 'swr';
import { WeeklySummariesSection } from './WeeklySummariesSection';
import {
  GetWeeklySummariesResponse,
  GetWeeklySummariesResponseSchema,
} from '@/types/api/weekly-summary';

async function fetchWeeklySummaries(
  limit?: number
): Promise<GetWeeklySummariesResponse> {
  const params = new URLSearchParams({
    ...(limit ? { limit: limit.toString() } : {}),
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
  onViewAll,
}: {
  limit?: number;
  onViewAll?: () => void;
}) {
  const { data, error, isLoading } = useSWR<GetWeeklySummariesResponse>(
    ['/api/weekly-summary', limit],
    ([, limit]) => fetchWeeklySummaries(limit as any)
  );

  return (
    <WeeklySummariesSection
      items={data?.items ?? []}
      isLoading={isLoading}
      error={error?.message ?? null}
      onViewAll={onViewAll}
    />
  );
}
