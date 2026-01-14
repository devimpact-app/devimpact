'use client';

import useSWR from 'swr';
import {
  GetWeeklySummaryDetailResponse,
  GetWeeklySummaryDetailResponseSchema,
} from '@/types/api/weekly-summary';
import { WeeklySummaryDetailPage } from './WeeklySummaryDetails';
// import { ThreadDetailPage } from './ThreadDetails';

async function fetchWeeklySummary(
  summaryId: string
): Promise<GetWeeklySummaryDetailResponse> {
  const res = await fetch(`/api/weekly-summary/${summaryId}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load weekly summary');
  }

  const { data } = await res.json();
  return GetWeeklySummaryDetailResponseSchema.parse(data);
}

export default function WeeklySummaryDetailsContainer({
  summaryId,
}: {
  summaryId: string;
}) {
  const { data, error, isLoading } = useSWR<GetWeeklySummaryDetailResponse>(
    [`/api/weekly-summary`, summaryId],
    ([, summaryId]) => fetchWeeklySummary(summaryId as string)
  );

  return (
    <WeeklySummaryDetailPage
      data={data}
      isLoading={isLoading}
      error={error?.message ?? null}
    />
  );
}
