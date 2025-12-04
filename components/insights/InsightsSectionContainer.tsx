'use client';

import { useRouter } from 'next/navigation';
import { InsightsSection } from './InsightsSection';
import { useInsights } from './useInsights';
import { Insight } from '@/types/api/insights';

export default function InsightsSectionContainer({
  onClickInsight,
}: {
  onClickInsight: (insight: Insight) => void;
}) {
  const router = useRouter();
  const { insights, error, isLoading } = useInsights({
    limit: 3,
    windowWeeks: 4,
  });

  return (
    <InsightsSection
      insights={insights}
      isLoading={isLoading}
      error={error?.message ?? null}
      onViewAll={() => {
        router.push('/insights');
      }}
      onInsightClick={onClickInsight}
    />
  );
}
