'use client';

import useSWR from 'swr';
import {
  GetThreadsResponse,
  GetThreadsResponseSchema,
} from '@/types/api/threads';
import { ThreadsSection } from './ThreadsSection';

async function fetchThreads(
  lookbackDays: number,
  limit?: number
): Promise<GetThreadsResponse> {
  const params = new URLSearchParams({
    lookbackDays: lookbackDays.toString(),
    ...(limit ? { limit: limit.toString() } : {}),
  });

  const res = await fetch(`/api/threads?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load threads');
  }

  const { data } = await res.json();
  return GetThreadsResponseSchema.parse(data);
}

export default function ThreadsSectionContainer({
  lookbackDays = 90,
  limit,
}: {
  lookbackDays?: number;
  limit?: number;
}) {
  const { data, error, isLoading } = useSWR<GetThreadsResponse>(
    ['/api/threads', lookbackDays, limit],
    ([, lookbackDays, limit]) => fetchThreads(lookbackDays as any, limit as any)
  );

  return (
    <ThreadsSection
      threads={data?.threads ?? []}
      isLoading={isLoading}
      error={error?.message ?? null}
      onViewAll={() => {}}
    />
  );
}
