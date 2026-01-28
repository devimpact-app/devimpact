import { subDays } from 'date-fns';
import { claimThreadingActivityEvents } from '../db/write/claimThreadingActivityEvents';
import { evaluateThreadCandidate } from './policy/threadCandidatePolicy';
import type { ActivityEvent } from '@/lib/db/schema/activity';
import { getPrSummariesByPrIds } from '../db/read/getPrSummariesByPrIds';
import { AssignThreadsInput, AssignThreadsOutput } from './llm/assign/types';
import { getExistingThreadsForThreading } from '../db/read/getExistingThreadsForThreading';
import { shapeEventForLLM } from './llm/assign/shapeEvents';
import { assignThreads } from './llm/assign/assignThreads';
import { validateAssignThreadsOutput } from './llm/assign/validate';
import { persistThreadAssignments } from '../db/write/persistThreadAssignments';
import { buildThreadSummaryInputs } from './llm/summaries/buildInput';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { generateThreadSummary } from './llm/summaries/generate';
import { validateThreadSummaryOutput } from './llm/summaries/validate';
import { persistThreadSummary } from '../db/write/persistThreadSummary';
import { AiConfig } from '@/lib/integrations/openai/config';
import { getPrIdsByReviewIds } from '../db/read/getPrIdsByReviewIds';
import { markActivityEventsFinalSkipped } from '../db/write/markActivityEventsFinalSkipped';
import { releaseThreadingClaims } from '../db/write/releaseThreadingClaims';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db/client';
import { applyThreadingAssignments } from '../db/write/applyThreadingDecisions';

const DEFAULT_LOOKBACK_DAYS = 14;
const DEFAULT_LIMIT = 50;

async function processThreadingChunk({
  tenantId,
  chunk: eligible,
  claimedBy,
  now,
}: {
  tenantId: string;
  chunk: ActivityEvent[];
  claimedBy?: string;
  now: Date;
}): Promise<{
  threadedCount: number;
  deferredCount: number;
}> {
  const logPrefix = `[threading] tenant=${tenantId} job=${claimedBy ?? 'unknown'} now=${now.toISOString()}`;
  console.log(`${logPrefix} eligible=${eligible.length}`);

  const prEventIds = eligible
    .filter((e) => e.sourceEntityTable === 'pull_requests')
    .map((e) => e.sourceEntityId);
  const prIdsByReviewId = await getPrIdsByReviewIds(
    tenantId,
    eligible
      .filter((e) => e.sourceEntityTable === 'reviews')
      .map((e) => e.sourceEntityId)
  );
  const allPrIds = [...prEventIds, ...Object.values(prIdsByReviewId)];
  const prSummariesByPrId = await getPrSummariesByPrIds(tenantId, allPrIds);

  console.log(
    `${logPrefix} prEventIds=${prEventIds.length} reviewIds=${Object.keys(prIdsByReviewId).length} allPrIds=${allPrIds.length} uniqueAllPrIds=${new Set(allPrIds).size}`
  );

  console.log(
    `${logPrefix} prSummaries fetched=${Object.keys(prSummariesByPrId).length} missing=${new Set(allPrIds).size - Object.keys(prSummariesByPrId).length}`
  );

  const finalEvents = eligible
    .map((e) => shapeEventForLLM(e, prSummariesByPrId, prIdsByReviewId))
    .filter((e) => !!e);
  const existingThreads = await getExistingThreadsForThreading({ tenantId });
  const assignInput: AssignThreadsInput = {
    mode: existingThreads.length ? 'incremental' : 'cold_start',
    events: finalEvents,
    existingThreads,
  };

  const rawAssignResponse = await assignThreads(assignInput);
  let validateAssignResponse = validateAssignThreadsOutput(rawAssignResponse, {
    candidateEventIds: eligible.map((e) => e.id),
    existingThreadIds: existingThreads.map((t) => t.id),
  });
  let assignResponse: AssignThreadsOutput;
  if (!validateAssignResponse.ok) {
    // Do one retry if prompt messed up
    const rawAssignResponseRetry = await assignThreads(assignInput);
    let validateAssignResponseRetry = validateAssignThreadsOutput(
      rawAssignResponseRetry,
      {
        candidateEventIds: eligible.map((e) => e.id),
        existingThreadIds: existingThreads.map((t) => t.id),
      }
    );
    if (!validateAssignResponseRetry.ok) {
      throw new Error(
        `Error during validation of thread assignment llm response ${validateAssignResponseRetry.error}`
      );
    }
    assignResponse = validateAssignResponseRetry.value;
  } else {
    assignResponse = validateAssignResponse.value;
  }

  const { createdThreads, insertedThreadEvents, threadedCount, deferredCount } =
    await db.transaction(async (tx) => {
      const res = await persistThreadAssignments({
        tenantId,
        candidateEvents: eligible.map((e) => ({
          id: e.id,
          occurredAt: e.occurredAt,
        })),
        llmOutput: assignResponse,
        tx,
      });

      const { threadedCount, deferredCount } = await applyThreadingAssignments({
        tenantId,
        llmOutput: assignResponse,
        now,
        claimedBy,
        deferAfterAttempts: 2,
        tx,
      });

      return {
        createdThreads: res.createdThreads,
        insertedThreadEvents: res.insertedThreadEvents,
        threadedCount,
        deferredCount,
      };
    });

  console.log(
    `${logPrefix} persist createdThreads=${createdThreads.length} insertedThreadEvents=${insertedThreadEvents.length} threadedCount=${threadedCount} deferredCount=${deferredCount}`
  );

  const summaryInputs = buildThreadSummaryInputs({
    finalEvents,
    createdThreads,
    insertedThreadEvents,
    existingThreads,
  });

  type SummaryResult =
    | { threadId: string; ok: true }
    | { threadId: string; ok: false; error: string };

  const results: SummaryResult[] = [];
  await mapWithConcurrency(summaryInputs, 3, async (input) => {
    const threadId = input.threadId;
    try {
      const out = await generateThreadSummary(input);
      const v = validateThreadSummaryOutput(out, {
        allowedEventIds: finalEvents.map((e) => e.id),
      });
      if (!v.ok) {
        throw new Error(
          `Error during validation of thread summary llm response ${v.error}`
        );
      }
      await persistThreadSummary({
        tenantId,
        threadId: input.threadId,
        output: v.value,
        llm: {
          model: AiConfig.models.summarize,
          promptVersion: '1',
        },
      });
      results.push({ threadId, ok: true });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      results.push({ threadId, ok: false, error: msg });

      console.error(logPrefix, {
        claimedBy,
        tenantId,
        phase: 'summary_failed',
        threadId,
        error: msg,
      });
    }
  });

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  console.log(logPrefix, {
    claimedBy,
    tenantId,
    phase: 'summaries_done',
    total: results.length,
    ok: okCount,
    failed: failCount,
  });

  return {
    threadedCount,
    deferredCount,
  };
}

export async function runThreadingPipelineOnce({
  tenantId,
  since,
  end,
  now,
  limit = DEFAULT_LIMIT,
  order = 'asc',
}: {
  tenantId: string;
  since: Date;
  end: Date;
  now: Date;
  limit?: number;
  order?: 'asc' | 'desc';
}): Promise<{
  claimedCount: number;
  eligibleCount: number;
  ineligibleCount: number;
  threadedCount: number;
  deferredCount: number;
}> {
  const workerId = `threading_${randomUUID()}`;
  const events = await claimThreadingActivityEvents({
    tenantId,
    since,
    end,
    limit,
    claimedBy: workerId,
    order,
  });
  if (events.length === 0) {
    return {
      claimedCount: 0,
      eligibleCount: 0,
      ineligibleCount: 0,
      threadedCount: 0,
      deferredCount: 0,
    };
  }
  const claimedIds = events.map((e) => e.id);

  console.log('[threading]', {
    runId: workerId,
    tenantId,
    phase: 'claimed',
    claimed: events.length,
    since: since.toISOString(),
    end: end.toISOString(),
  });

  const eligible: ActivityEvent[] = [];
  const ineligible: { eventId: string; reasons: string[] }[] = [];
  try {
    for (const event of events) {
      const decision = evaluateThreadCandidate(event);
      if (!decision.eligible) {
        ineligible.push({ eventId: event.id, reasons: decision.reasons });
      } else {
        eligible.push(event);
      }
    }
    console.log('eligible/skipped', eligible.length, ineligible.length);

    if (ineligible.length) {
      await markActivityEventsFinalSkipped({
        tenantId,
        decisions: ineligible,
        now,
      });
    }

    let threadedCount = 0;
    let deferredCount = 0;

    if (eligible.length) {
      const out = await processThreadingChunk({
        tenantId,
        chunk: eligible,
        now,
        claimedBy: workerId,
      });
      threadedCount = out.threadedCount;
      deferredCount = out.deferredCount;
    }

    await releaseThreadingClaims({
      tenantId,
      eventIds: events.map((e) => e.id),
      now,
      claimedBy: workerId,
    });

    return {
      claimedCount: events.length,
      eligibleCount: eligible.length,
      ineligibleCount: ineligible.length,
      threadedCount,
      deferredCount,
    };
  } catch (err: any) {
    await releaseThreadingClaims({
      tenantId,
      eventIds: claimedIds,
      claimedBy: workerId,
      now: new Date(),
      errorMessage: err?.message ?? String(err),
    });

    throw err;
  }
}

const DEFAULT_BATCH_SIZE = 50; // keep LLM input manageable
const DEFAULT_MAX_STEPS = 50; // hard stop against infinite loops

export async function runThreadingPipeline({
  tenantId,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  batchSize = DEFAULT_BATCH_SIZE,
  maxSteps = DEFAULT_MAX_STEPS,
}: {
  tenantId: string;
  lookbackDays?: number;
  batchSize?: number;
  maxSteps?: number;
  claimedBy?: string;
}) {
  const now = new Date();
  const since = subDays(now, lookbackDays);

  let totals = {
    steps: 0,
    claimed: 0,
    eligible: 0,
    ineligible: 0,
    threaded: 0,
    deferred: 0,
  };

  for (let step = 0; step < maxSteps; step++) {
    totals.steps++;

    const res = await runThreadingPipelineOnce({
      tenantId,
      since,
      end: now,
      now,
      limit: batchSize,
    });
    console.log('pipeline resp', res);

    totals.claimed += res.claimedCount;
    totals.eligible += res.eligibleCount;
    totals.ineligible += res.ineligibleCount;
    totals.threaded += res.threadedCount ?? 0;
    totals.deferred += res.deferredCount ?? 0;

    if (res.claimedCount === 0) break;
  }

  return totals;
}
