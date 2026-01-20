import { getAuthoredPrs } from '@/lib/domains/timeline/db/getAuthoredPrs';
import { JobHandlerInput, JobHandlerResult } from '../types';
import { BootstrapCursor } from './types';
import { getAuthoredReviews } from '@/lib/domains/timeline/db/getAuthoredReviews';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '@/lib/domains/pull-requests/service/getOrGeneratePrSummary';

const DEFAULT_PER_RUN = 15;

export async function stepSummarizePrs(
  input: JobHandlerInput,
  cursor: BootstrapCursor
): Promise<JobHandlerResult> {
  const { job, now } = input;
  const { tenantId } = job;

  const hasPlan =
    !!cursor.summarize && (cursor.summarize.items?.length ?? 0) > 0;
  if (!hasPlan) {
    const lookbackDays = cursor.lookbackDays ?? 14;
    const start = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const authoredPrs = await getAuthoredPrs({
      tenantId,
      start,
      end: now,
    });
    const mergedPrs = authoredPrs.filter((pr) => !!pr.mergedAt);
    const authoredReviews = await getAuthoredReviews(
      {
        tenantId,
        start,
        end: now,
      },
      {
        joinWithPrs: true,
      }
    );
    const reviewedPrMap = new Map<string, (typeof mergedPrs)[number]>();
    for (const r of authoredReviews) {
      const pr = r.pr;
      if (!pr) continue;
      if (pr.authorIsTenant) continue;
      if (!reviewedPrMap.has(pr.id)) {
        reviewedPrMap.set(pr.id, pr);
      }
    }
    const reviewedPrs = Array.from(reviewedPrMap.values());

    const cursorItems = [
      ...mergedPrs.map((pr) => ({
        prId: pr.id,
        mode: 'authored' as 'authored' | 'reviewed',
      })),
      ...reviewedPrs.map((pr) => ({
        prId: pr!.id,
        mode: 'reviewed' as 'authored' | 'reviewed',
      })),
    ];
    const nextCursor: BootstrapCursor = {
      ...cursor,
      summarize: {
        items: cursorItems,
        idx: 0,
        perRun: cursor.summarize?.perRun ?? DEFAULT_PER_RUN,
        concurrency: cursor.summarize?.concurrency ?? 5,
        succeeded: 0,
        failed: 0,
      },
    };
    return {
      outcome: 'requeue',
      cursor: nextCursor,
      progress: {
        step: 'summarize_prs',
        message: `Prepared PR summary plan (${mergedPrs.length} authored, ${reviewedPrs.length} reviewed)`,
        current: 0,
        total: cursorItems.length,
      },
      nextRunAt: new Date(now.getTime() + 1_000),
    };
  }

  const summarizeParams = cursor.summarize!;
  const perRun = summarizeParams.perRun ?? DEFAULT_PER_RUN;
  const startIdx = summarizeParams.idx ?? 0;
  const endIdx = Math.min(startIdx + perRun, summarizeParams.items.length);
  const itemsToSummarize = summarizeParams.items.slice(startIdx, endIdx);

  let succeeded = summarizeParams.succeeded ?? 0;
  let failed = summarizeParams.failed ?? 0;
  await mapWithConcurrency(
    itemsToSummarize,
    summarizeParams.concurrency,
    async (item) => {
      try {
        await getOrGeneratePrSummary({
          tenantId,
          prId: item.prId,
          useReviewedPrompt: item.mode === 'reviewed',
        });
        succeeded += 1;
      } catch (e) {
        failed += 1;
        console.error('[BOOTSTRAP SUMMARIZE] failed', {
          tenantId,
          prId: item.prId,
          err: e,
        });
      }
    }
  );

  const nextIdx = endIdx;
  const done = nextIdx >= summarizeParams.items.length;

  if (done && failed > 0) {
    const retryCursor: BootstrapCursor = {
      ...cursor,
      step: 'summarize_prs',
      summarize: { ...summarizeParams, idx: 0, succeeded, failed },
    };

    return {
      outcome: 'requeue',
      cursor: retryCursor,
      progress: {
        step: 'summarize_prs',
        message: `Some PR summaries failed (${failed}). Retrying…`,
        current: summarizeParams.items.length - failed,
        total: summarizeParams.items.length,
      },
      nextRunAt: new Date(now.getTime() + 2_000),
    };
  }

  const nextCursor: BootstrapCursor = {
    ...cursor,
    step: done ? 'threading' : 'summarize_prs',
    summarize: {
      ...summarizeParams,
      idx: nextIdx,
      succeeded,
      failed,
    },
  };

  return {
    outcome: 'requeue',
    cursor: nextCursor,
    progress: {
      step: 'summarize_prs',
      message: done
        ? 'Finished PR summaries'
        : `Summarizing PRs (${nextIdx}/${summarizeParams.items.length})…`,
      current: nextIdx,
      total: summarizeParams.items.length,
    },
    nextRunAt: new Date(now.getTime() + 1_000),
  };
}
