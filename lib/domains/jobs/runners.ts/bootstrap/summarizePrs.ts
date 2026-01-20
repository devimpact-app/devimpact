import { JobHandlerInput, JobHandlerResult } from '../types';
import { BootstrapCursor } from './types';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '@/lib/domains/pull-requests/service/getOrGeneratePrSummary';
import { getPrsToSummarize } from '../../db/getPrsToSummarize';

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
    const items = await getPrsToSummarize({
      tenantId,
      start,
      end: now,
    });
    if (items.length === 0) {
      return {
        outcome: 'requeue',
        cursor: { ...cursor, step: 'threading' },
        progress: { step: 'summarize_prs', message: 'No PRs needed summaries' },
        nextRunAt: new Date(now.getTime() + 1_000),
      };
    }

    const nextCursor: BootstrapCursor = {
      ...cursor,
      summarize: {
        items: items,
        idx: 0,
        pass: 0,
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
        message: `Prepared PR summary plan (${items.length} PRs)`,
        current: 0,
        total: items.length,
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
    const pass = summarizeParams.pass ?? 0;
    if (pass < 1) {
      const retryCursor: BootstrapCursor = {
        ...cursor,
        step: 'summarize_prs',
        summarize: {
          ...summarizeParams,
          idx: 0,
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
          current: summarizeParams.items.length - failed,
          total: summarizeParams.items.length,
        },
        nextRunAt: new Date(now.getTime() + 2_000),
      };
    }

    throw new Error(
      `bootstrap summarize_prs: ${failed}/${summarizeParams.items.length} PR summaries failed after ${pass + 1} passes`
    );
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
