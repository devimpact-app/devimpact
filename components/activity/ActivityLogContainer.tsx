'use client';

import useSWR from 'swr';
import { ActivityLog } from './ActivityLog';
import { ActivityEvent, ActivityEventSchema } from '@/types/api/timeline';

type ActivityLogMode = 'preview' | 'full';

async function fetchActivityEvents(
  start?: string,
  end?: string
): Promise<ActivityEvent[]> {
  const params = new URLSearchParams({
    ...(!start && !end ? { showRecent: 'true' } : {}),
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
  });

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
  onEventClick,
}: {
  mode?: ActivityLogMode;
  startISO?: string;
  endISO?: string;
  onEventClick?: (event: ActivityEvent) => void;
}) {
  const { data, isLoading } = useSWR<ActivityEvent[]>(
    ['/api/activity', startISO, endISO, 'showRecent'],
    ([, start, end]) => fetchActivityEvents(start as string, end as string)
  );

  return (
    <ActivityLog
      events={data ?? []}
      loading={isLoading}
      mode={mode}
      onEventClick={onEventClick}
    />
  );
}
