import { getAuthoredPrs } from '@/lib/domains/timeline/db/getAuthoredPrs';
import { getReviewRequestedPrs } from '@/lib/domains/timeline/db/getReviewRequestedPrs';
import { serializeShippedItem } from '@/lib/domains/weekly-activity/api/serializers';
import { PullRequest } from '@/lib/db/schema';
import { getOrGeneratePrSummary } from '@/lib/integrations/openai/services/summarizePR';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { ShippedItem } from '@/types/api/weekly-activity';
import { subDays } from 'date-fns';

const STALE_LOOKBACK_DAYS = 7;
const REVIEW_REQUEST_LOOKBACK_DAYS = 14;

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

  const lowerBound = new Date(
    Date.now() - REVIEW_REQUEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  );
  const reviewRequestedPrs = await getReviewRequestedPrs({
    tenantId,
    lowerBound,
  });

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

  // TODO: use a better type for these - they're not shipped items
  const inFlightPrs = notMergedPrs.map((pr) =>
    serializeShippedItem(pr, 'other', summariesByPrId)
  );
  const waitingForReviewPrs = reviewRequestedPrs.map((pr) =>
    serializeShippedItem(pr, 'other')
  );

  return {
    llm: {
      inFlightPrs,
      waitingForReviewPrs,
    },
    full: {
      fullPrs,
      prSummariesById: summariesByPrId,
    },
  };
}
