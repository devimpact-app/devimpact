'use client';

import useSWR from 'swr';
import {
  GetThreadsResponse,
  GetThreadsResponseSchema,
} from '@/types/api/threads';
import { RecentThreadsDashboardCard } from './RecentThreadsCard';

async function fetchLatestThreads(): Promise<GetThreadsResponse> {
  const params = new URLSearchParams({
    limit: '3',
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

export default function RecentThreadsDashboardCardContainer() {
  const { data, error, isLoading } = useSWR<GetThreadsResponse>(
    ['/api/threads', '3'],
    ([,]) => fetchLatestThreads()
  );

  return (
    <RecentThreadsDashboardCard
      threads={data?.threads ?? []}
      isLoading={isLoading}
      error={error?.message ?? null}
    />
  );
}
