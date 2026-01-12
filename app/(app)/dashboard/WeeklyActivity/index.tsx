'use client';

import useSWR from 'swr';
import { WeeklyActivityCard } from './WeeklyActivityCard';
import {
  WeeklyActivity,
  WeeklyActivitySchema,
} from '@/types/api/weekly-activity';
import { getTimezone } from '@/lib/utils/date';

async function fetchWeeklyActivity(
  start: string,
  end: string,
  timezone: string
): Promise<WeeklyActivity> {
  const params = new URLSearchParams({
    start,
    end,
    timezone,
  });

  const res = await fetch(`/api/weekly-activity?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load weekly summary');
  }

  const { data } = await res.json();
  return WeeklyActivitySchema.parse(data);
}

export default function WeeklyActivityCardContainer({
  startISO,
  endISO,
  handleOneOnOne,
}: {
  startISO: string;
  endISO: string;
  handleOneOnOne: () => void;
}) {
  const timezone = getTimezone();

  const { data, error, isLoading } = useSWR<WeeklyActivity>(
    ['/api/weekly-activity', startISO, endISO, timezone],
    ([, start, end, tz]) =>
      fetchWeeklyActivity(start as string, end as string, tz as string)
  );

  return (
    <WeeklyActivityCard
      summary={data}
      isLoading={isLoading}
      error={error?.message ?? null}
      handleOneOnOne={handleOneOnOne}
    />
  );
}
