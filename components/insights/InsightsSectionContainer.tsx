'use client';

import useSWR from 'swr';
import { InsightsResponse, InsightsResponseSchema } from '@/types/api/insights';
import { InsightsSection } from './InsightsSection';

async function fetchInsights(timezone: string): Promise<InsightsResponse> {
  const params = new URLSearchParams({
    timezone,
  });
  const res = await fetch(`/api/insights?${params.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load insights');
  const json = await res.json();
  return InsightsResponseSchema.parse(json.data ?? json);
}

export default function InsightsSectionContainer() {
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';
  const { data, error, isLoading } = useSWR<InsightsResponse>(
    ['/api/insights', timezone],
    ([, tz]) => fetchInsights(tz as string)
  );

  return (
    <InsightsSection
      insights={data?.insights}
      isLoading={isLoading}
      error={error?.message ?? null}
      onViewAll={() => {}}
    />
  );
}
