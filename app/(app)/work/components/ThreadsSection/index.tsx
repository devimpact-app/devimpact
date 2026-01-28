'use client';

import useSWR from 'swr';
import {
  GetThreadsResponse,
  GetThreadsResponseSchema,
} from '@/types/api/threads';
import { ThreadsSection } from './ThreadsSection';

async function fetchThreads(
  lookbackDays: number,
  limit?: number,
  categoryKey?: string,
  oldestFirst?: boolean
): Promise<GetThreadsResponse> {
  const params = new URLSearchParams({
    lookbackDays: lookbackDays.toString(),
    ...(limit ? { limit: limit.toString() } : {}),
    ...(categoryKey ? { category: categoryKey } : {}),
    ...(oldestFirst ? { oldestFirst: 'true' } : {}),
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
  categoryKey,
  oldestFirst = false,
  hideHeader = false,
  onViewAll,
  handleLoadMore,
}: {
  lookbackDays?: number;
  limit?: number;
  categoryKey?: string;
  oldestFirst?: boolean;
  hideHeader?: boolean;
  onViewAll?: () => void;
  handleLoadMore?: () => void;
}) {
  const { data, error, isLoading } = useSWR<GetThreadsResponse>(
    ['/api/threads', lookbackDays, limit, categoryKey, oldestFirst],
    ([, lookbackDays, limit, categoryKey, oldestFirst]) =>
      fetchThreads(
        lookbackDays as any,
        limit as any,
        categoryKey as any,
        oldestFirst as any
      ),
    {
      keepPreviousData: true,
    }
  );

  return (
    <ThreadsSection
      threads={data?.threads ?? []}
      totalThreads={data?.totalThreads ?? 0}
      isLoading={isLoading}
      error={error?.message ?? null}
      hideHeader={hideHeader}
      onViewAll={onViewAll}
      handleLoadMore={handleLoadMore}
    />
  );
}
