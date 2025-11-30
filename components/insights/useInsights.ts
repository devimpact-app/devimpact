'use client';

import useSWR from 'swr';
import { InsightsResponse, InsightsResponseSchema } from '@/types/api/insights';

async function fetchInsights(
  timezone: string,
  limit?: number,
  windowWeeks?: number
): Promise<InsightsResponse> {
  const params = new URLSearchParams({
    timezone,
  });

  if (typeof limit === 'number') {
    params.set('limit', String(limit));
  }
  if (typeof windowWeeks === 'number') {
    params.set('windowWeeks', String(windowWeeks));
  }

  const res = await fetch(`/api/insights?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Failed to load insights');

  const json = await res.json();
  return InsightsResponseSchema.parse(json.data ?? json);
}

type UseInsightsArgs = {
  timezone?: string;
  limit?: number;
  windowWeeks?: number;
};

export function useInsights({ timezone, limit, windowWeeks }: UseInsightsArgs) {
  const tz =
    timezone ??
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC');

  const key: [string, string, number | undefined, number | undefined] = [
    '/api/insights',
    tz,
    limit,
    windowWeeks,
  ];

  const { data, error, isLoading } = useSWR<InsightsResponse>(
    key,
    ([, tz, l, w]) =>
      fetchInsights(
        tz as string,
        l as number | undefined,
        w as number | undefined
      )
  );

  return {
    insights: data?.insights ?? [],
    data,
    error,
    isLoading,
  };
}
