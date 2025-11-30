'use client';

import { InsightsSection } from './InsightsSection';
import { useInsights } from './useInsights';

export default function InsightsSectionContainer() {
  const { insights, error, isLoading } = useInsights({
    limit: 3,
    windowWeeks: 4,
  });

  return (
    <InsightsSection
      insights={insights}
      isLoading={isLoading}
      error={error?.message ?? null}
      onViewAll={() => {}}
    />
  );
}
