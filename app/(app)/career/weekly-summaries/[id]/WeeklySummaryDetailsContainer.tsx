'use client';

import useSWR from 'swr';
import {
  GetWeeklySummaryDetailResponse,
  GetWeeklySummaryDetailResponseSchema,
} from '@/types/api/weekly-summary';
import { WeeklySummaryDetailPage } from './WeeklySummaryDetails';
import { useState } from 'react';
import { postJson } from '@/components/api';
import { getTimezone } from '@/lib/utils/date';

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
  const [generateLoading, setGenerateLoading] = useState<boolean>(false);

  const swrKey = [`/api/weekly-summary`, summaryId] as const;

  const { data, error, isLoading, mutate } =
    useSWR<GetWeeklySummaryDetailResponse>(swrKey, ([, summaryId]) =>
      fetchWeeklySummary(summaryId as string)
    );

  async function handleRegenerateClick() {
    setGenerateLoading(true);

    const weekStartIso = data?.summary.weekStartLocalDate;
    if (!weekStartIso) {
      setGenerateLoading(false);
      return;
    }

    try {
      await postJson('/api/weekly-summary/run', {
        timezone: getTimezone(),
        weekStartIso,
        force: true,
      });

      await mutate();
    } catch (e: any) {
      // setGenerateError(e.message ?? 'Failed to generate weekly summary');
    } finally {
      setGenerateLoading(false);
    }
  }

  return (
    <WeeklySummaryDetailPage
      data={data}
      isLoading={isLoading}
      error={error?.message ?? null}
      generateLoading={generateLoading}
      onRegenerate={handleRegenerateClick}
    />
  );
}
