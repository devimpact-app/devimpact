import { JobHandlerInput, JobHandlerResult } from '../types';
import { BackfillCursor } from './types';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '@/lib/domains/pull-requests/service/getOrGeneratePrSummary';
import { getPrsToSummarize } from '../../db/getPrsToSummarize';

const DEFAULT_PER_RUN = 15;

export async function stepSummarizePrs(
  input: JobHandlerInput,
  cursor: BackfillCursor
): Promise<JobHandlerResult> {
  const { job, now } = input;
  const { tenantId } = job;

  const summarizeParams = cursor.summarize!;
  const perRun = summarizeParams.perRun ?? DEFAULT_PER_RUN;
  const windowStart = new Date(cursor.windowStartISO);
  const windowEnd = new Date(cursor.windowEndISO);
  const beforeSortAt = summarizeParams.beforeSortAtISO
    ? new Date(summarizeParams.beforeSortAtISO)
    : null;
  const prsToSummarize = await getPrsToSummarize({
    tenantId,
    start: windowStart,
    end: windowEnd,
    limit: perRun,
    beforeSortAt,
  });

  if (prsToSummarize.length === 0) {
    return {
      outcome: 'requeue',
      cursor: { ...cursor, step: 'threading' },
      progress: { step: 'summarize_prs', message: 'No PRs needed summaries' },
      nextRunAt: new Date(now.getTime() + 1_000),
    };
  }

  let succeeded = summarizeParams.succeeded ?? 0;
  let failed = summarizeParams.failed ?? 0;
  await mapWithConcurrency(
    prsToSummarize,
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

  const last = prsToSummarize[prsToSummarize.length - 1];
  const nextBeforeSortAtISO = last.sortAt
    ? last.sortAt.toISOString()
    : summarizeParams.beforeSortAtISO;

  if (failed > 0) {
    const pass = summarizeParams.pass ?? 0;
    if (pass < 1) {
      const retryCursor: BackfillCursor = {
        ...cursor,
        step: 'summarize_prs',
        summarize: {
          ...summarizeParams,
          beforeSortAtISO: undefined,
          pass: pass + 1,
          succeeded,
          failed,
        },
      };

      return {
        outcome: 'requeue',
        cursor: retryCursor,
        progress: {
          step: 'summarize_prs',
          message: `Some PR summaries failed (${failed}). Retrying (pass ${pass + 1})…`,
          current: 0,
          total: 0,
        },
        nextRunAt: new Date(now.getTime() + 2_000),
      };
    }

    throw new Error(
      `bootstrap summarize_prs: ${failed} PR summaries failed after ${pass + 1} passes`
    );
  }

  const nextCursor: BackfillCursor = {
    ...cursor,
    summarize: {
      ...summarizeParams,
      beforeSortAtISO: nextBeforeSortAtISO,
      succeeded,
      failed,
    },
  };

  const nextCurrent = succeeded;
  return {
    outcome: 'requeue',
    cursor: nextCursor,
    progress: {
      step: 'summarize_prs',
      message: `Summarizing PRs (${nextCurrent})…`,
      current: nextCurrent,
    },
    nextRunAt: new Date(now.getTime() + 1_000),
  };
}
