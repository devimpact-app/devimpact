import {
  UpcomingCalendarEventsResponseSchema,
  UpcomingCalendarEventsResponse,
} from '@/types/api/prep';
import useSWR from 'swr';
import { UpcomingPrepCard } from './UpcomingPrepCard';

async function fetchUpcomingEvents(params: {
  // timezone: string;
  windowDays?: number;
}): Promise<UpcomingCalendarEventsResponse> {
  const search = new URLSearchParams({
    // timezone: params.timezone,
    days: String(params.windowDays ?? 3),
  });

  const res = await fetch(`/api/prep/upcoming?${search.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Failed to load upcoming meetings');

  const { data } = await res.json();
  return UpcomingCalendarEventsResponseSchema.parse(data);
}

export function UpcomingPrepCardContainer({
  variant,
}: {
  variant?: 'dashboard' | 'prep';
}) {
  const { data, error, isLoading } = useSWR(
    ['/api/prep/upcoming'],
    ([]) => fetchUpcomingEvents({}),
    {
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
      refreshInterval: 60_000,
    }
  );

  return (
    <UpcomingPrepCard
      calendarConnected={data?.calendarConnected ?? false}
      events={data?.items ?? []}
      isLoading={isLoading}
      error={error?.message ?? null}
      hideOpen={variant === 'prep'}
    />
  );
}
