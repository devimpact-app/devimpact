'use client';

import useSWR from 'swr';
import { ActivityLog } from './ActivityLog';
import { ActivityEvent, ActivityEventSchema } from '@/types/api/timeline';

type ActivityLogMode = 'preview' | 'full';

async function fetchActivityEvents(
  start: string,
  end: string
): Promise<ActivityEvent[]> {
  const params = new URLSearchParams({ start, end });

  const res = await fetch(`/api/activity?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Failed to load activity log');

  const { data } = await res.json();
  return data.events.map((e: any) => ActivityEventSchema.parse(e));
}

export function ActivityLogContainer({
  mode = 'preview',
  startISO,
  endISO,
  onViewAllClick,
}: {
  mode?: ActivityLogMode;
  startISO: string;
  endISO: string;
  onViewAllClick?: () => void;
}) {
  const { data, isLoading } = useSWR<ActivityEvent[]>(
    ['/api/activity', startISO, endISO],
    ([, start, end]) => fetchActivityEvents(start as string, end as string)
  );

  return (
    <ActivityLog
      events={data ?? []}
      loading={isLoading}
      mode={mode}
      onViewAllClick={onViewAllClick}
    />
  );
}
