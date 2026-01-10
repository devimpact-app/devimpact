'use client';

import {
  ActivityEventInspectorResponse,
  ActivityEventInspectorResponseSchema,
} from '@/types/api/threads';
import useSWR from 'swr';

async function fetchActivityEventInspector(
  activityEventId: string
): Promise<ActivityEventInspectorResponse> {
  const res = await fetch(`/api/activity/${activityEventId}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || 'Failed to load activity event');
  }

  const { data } = await res.json();
  console.log('data', data);
  return ActivityEventInspectorResponseSchema.parse(data);
}

export function useActivityEventInspector(activityEventId?: string | null) {
  const key = activityEventId ? ['/api/activity', activityEventId] : null;

  return useSWR<ActivityEventInspectorResponse>(
    key,
    ([, id]) => fetchActivityEventInspector(id as string),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );
}
