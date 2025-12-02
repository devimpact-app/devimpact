import { InsightStat } from '@/types/api/insights';
import { buildInsights } from '../insights';
import { OneOnOneInsightForLLM } from './types';

const maxInsights = 10;

export async function fetchInsightsForWindow(params: {
  tenantId: string;
  timezone: string;
  start: Date;
  end: Date;
}): Promise<OneOnOneInsightForLLM[]> {
  const { tenantId, timezone, start, end } = params;

  const { insights } = await buildInsights({
    userId: tenantId,
    timezone,
    // TODO: add limit when more insights
    startOverride: start,
    endOverride: end,
  });

  return insights
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, maxInsights)
    .map<OneOnOneInsightForLLM>((insight) => {
      // Take up to 3 primary stats as keyStats
      const primaryStats = (insight.stats ?? []).filter(
        (s: InsightStat) => !s.importance || s.importance === 'primary'
      );
      const keyStats =
        primaryStats.length > 0
          ? primaryStats.slice(0, 3).map((s) => ({
              label: s.label,
              value: s.value,
            }))
          : undefined;

      // Take up to 3 relatedItems as examples
      const related = insight.relatedItems ?? [];
      const examples =
        related.length > 0
          ? related.slice(0, 3).map((item) => ({
              id: item.id,
              entityType: item.entityType,
              title: item.title,
              url: item.htmlUrl,
            }))
          : undefined;

      return {
        id: insight.id,
        kind: insight.kind,
        severity: insight.severity,
        score: insight.score,
        window: 'medium',

        title: insight.title,
        emphasis: insight.emphasis,
        body: insight.body,

        keyStats,
        examples,
      };
    });
}
