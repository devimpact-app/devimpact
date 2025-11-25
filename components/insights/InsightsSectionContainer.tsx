'use client';

import useSWR from 'swr';
import { InsightsResponse, InsightsResponseSchema } from '@/types/api/insights';
import { InsightsSection } from './InsightsSection';

async function fetchInsights(): Promise<InsightsResponse> {
  const res = await fetch('/api/insights', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load insights');
  const json = await res.json();
  return InsightsResponseSchema.parse(json.data ?? json);
}

export default function InsightsSectionContainer() {
  const { data, error, isLoading } = useSWR<InsightsResponse>(
    ['/api/insights'],
    () => fetchInsights()
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
