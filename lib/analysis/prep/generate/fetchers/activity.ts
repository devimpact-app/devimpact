import { getOrGeneratePrSummary } from '@/lib/integrations/openai/services/summarizePR';
import { getAuthoredPrs } from '../../../activity/getAuthoredPrs';
import { getAuthoredReviews } from '../../../activity/getAuthoredReviews';
import { pickHighlightedAuthoredPrs } from '../../../weekly-summary/highlightedPrs';
import { pickHighlightedReview } from '../../../weekly-summary/highlightedReviews';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { buildTagFrequencyMap } from '../../../weekly-summary/focusAreas';
import { HighlightedReview, ShippedItem } from '@/types/api/weekly-summary';
import { OneOnOneTagForLLM } from '../../one-on-ones/types';
import { PullRequest, Review } from '@/lib/db/schema';
import { PR_TYPE_LABELS } from '@/lib/integrations/openai/prompts/prSummary';

export type FetchPrepActivityResponse = {
  llm: {
    highlightPrs: ShippedItem[];
    highlightedReviews: HighlightedReview[];
    tags: OneOnOneTagForLLM[];
  };
  full: {
    fullPrs: PullRequest[];
    fullReviews: {
      review: Review;
      pr?: PullRequest | null;
    }[];
  };
};

export async function getActivityForOneOnOneRange({
  tenantId,
  start,
  end,
}: {
  tenantId: string;
  timezone: string;
  start: Date;
  end: Date;
}): Promise<FetchPrepActivityResponse> {
  const activityParams = {
    tenantId,
    start,
    end,
  };
  const authoredPrs = await getAuthoredPrs(activityParams);
  const authoredReviews = await getAuthoredReviews(activityParams, {
    joinWithPrs: true,
  });
  const mergedPrs = authoredPrs.filter((pr) => !!pr.mergedAt);

  const summariesByPrId = new Map<string, any>();
  const summaryResults = await mapWithConcurrency(mergedPrs, 5, async (pr) => {
    const { row } = await getOrGeneratePrSummary({
      tenantId,
      prId: pr.id,
    });
    return { prId: pr.id, row };
  });
  for (const { prId, row } of summaryResults) {
    summariesByPrId.set(prId, row);
  }

  const highlightPrs = pickHighlightedAuthoredPrs(mergedPrs, summariesByPrId);
  const highlightedReviewed = pickHighlightedReview(authoredReviews as any);

  const allFocusTags = mergedPrs.flatMap((pr) => {
    const s = summariesByPrId.get(pr.id);
    return s?.typeTags ?? [];
  });
  const freq = buildTagFrequencyMap(allFocusTags);
  const tags = Object.entries(freq).map(([rawTag, count]) => {
    return { tag: PR_TYPE_LABELS[rawTag], count };
  });

  return {
    llm: {
      highlightPrs,
      highlightedReviews: highlightedReviewed ? [highlightedReviewed] : [],
      tags,
    },
    full: {
      fullPrs: mergedPrs,
      fullReviews: authoredReviews,
    },
  };
}
