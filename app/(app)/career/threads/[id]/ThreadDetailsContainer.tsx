'use client';

import useSWR from 'swr';
import {
  GetThreadDetailResponse,
  GetThreadDetailResponseSchema,
} from '@/types/api/threads';
import { ThreadDetailPage } from './ThreadDetails';

async function fetchThreadDetails(
  threadId: string
): Promise<GetThreadDetailResponse> {
  const res = await fetch(`/api/threads/${threadId}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load thread details');
  }

  const { data } = await res.json();
  return GetThreadDetailResponseSchema.parse(data);
}

export default function ThreadDetailsContainer({
  threadId,
}: {
  threadId: string;
}) {
  const { data, error, isLoading } = useSWR<GetThreadDetailResponse>(
    [`/api/threads/${threadId}`, threadId],
    ([, threadId]) => fetchThreadDetails(threadId as string)
  );

  return (
    <ThreadDetailPage
      data={data}
      isLoading={isLoading}
      error={error?.message ?? null}
    />
  );
}
