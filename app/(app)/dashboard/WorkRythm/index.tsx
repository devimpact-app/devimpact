'use client';

import useSWR from 'swr';
import { WorkRhythmCard } from './WorkRythmCard';
import { WorkRhythm, WorkRhythmSchema } from '@/types/api/work-rhythm';
import { getTimezone } from '@/lib/utils/date';

async function fetchWorkRhythm(timezone: string): Promise<WorkRhythm> {
  const params = new URLSearchParams({
    timezone,
  });

  const res = await fetch(`/api/work-rhythm?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load work rhythm');
  }

  const { data } = await res.json();
  return WorkRhythmSchema.parse(data);
}

export default function WorkRhythmCardContainer() {
  const timezone = getTimezone();

  const { data, error, isLoading } = useSWR<WorkRhythm>(
    ['/api/work-rhythm', timezone],
    ([, tz]) => fetchWorkRhythm(tz as string),
    {}
  );

  return (
    <WorkRhythmCard
      rhythm={data}
      loading={isLoading}
      error={error?.message ?? null}
      onViewTimelineClick={() => {
        // e.g. router.push('/timeline?windowDays=30');
      }}
    />
  );
}
