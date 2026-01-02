import { getAuthoredPrs } from '@/lib/analysis/timeline/getAuthoredPrs';
import { getShippedItemFromPr } from '@/lib/analysis/weekly-summary/highlightedPrs';
import { PullRequest } from '@/lib/db/schema';
import { getOrGeneratePrSummary } from '@/lib/integrations/openai/services/summarizePR';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { ShippedItem } from '@/types/api/weekly-summary';
import { subDays } from 'date-fns';

const STALE_LOOKBACK_DAYS = 7;

export type FetchPrepInFlightResponse = {
  llm: {
    inFlightPrs: ShippedItem[];
    waitingForReviewPrs: ShippedItem[];
  };
  full: {
    fullPrs: PullRequest[];
    prSummariesById: Map<string, any>;
  };
};

export async function fetchInFlightContext(params: {
  tenantId: string;
  timezone: string;
  now?: Date;
}): Promise<FetchPrepInFlightResponse> {
  const { tenantId, timezone, now = new Date() } = params;

  const activityParams = {
    tenantId,
    // Ignore PRs created more than a week ago
    start: subDays(now, STALE_LOOKBACK_DAYS),
    end: now,
  };
  const authoredPrs = await getAuthoredPrs(activityParams);
  const notMergedPrs = authoredPrs.filter((pr) => !pr.mergedAt);

  // Later: reviews waiting on me
  // Set lookback date max
  /// Put into LLM format
  // Need to update CLI to pull these in

  const summariesByPrId = new Map<string, any>();
  const summaryResults = await mapWithConcurrency(
    notMergedPrs,
    5,
    async (pr) => {
      const { row } = await getOrGeneratePrSummary({
        tenantId,
        prId: pr.id,
      });
      return { prId: pr.id, row };
    }
  );
  for (const { prId, row } of summaryResults) {
    summariesByPrId.set(prId, row);
  }

  const fullPrs = [...notMergedPrs];
  const inFlightPrs = notMergedPrs.map((pr) =>
    getShippedItemFromPr(pr, 'other', summariesByPrId)
  );

  return {
    llm: {
      inFlightPrs,
      waitingForReviewPrs: [],
    },
    full: {
      fullPrs,
      prSummariesById: summariesByPrId,
    },
  };
}
