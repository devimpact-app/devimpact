import { subDays } from 'date-fns';
import { getUnthreadedActivityEvents } from './queries/getUnthreadedActivityEvents';
import { evaluateThreadCandidate } from './policy/threadCandidatePolicy';
import type { ActivityEvent } from '@/lib/db/schema/activity';
import { getPrSummariesByPrIds } from './queries/getPrSummariesByPrIds';
import { AssignThreadsInput, AssignThreadsOutput } from './llm/assign/types';
import { getExistingThreadsForThreading } from './queries/getExistingThreadsForThreading';
import { shapeEventForLLM } from './llm/assign/shapeEvents';
import { assignThreads } from './llm/assign/assignThreads';
import { validateAssignThreadsOutput } from './llm/assign/validate';
import { persistThreadAssignments } from './storage/persistThreadAssignments';
import { buildThreadSummaryInputs } from './llm/summaries/buildInput';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { generateThreadSummary } from './llm/summaries/generate';
import { validateThreadSummaryOutput } from './llm/summaries/validate';
import { persistThreadSummary } from './storage/persistThreadSummary';
import { AiConfig } from '@/lib/integrations/openai/config';
import { getPrIdsByReviewIds } from './queries/getPrIdsByReviewIds';

const DEFAULT_LOOKBACK_DAYS = 14;
const DEFAULT_LIMIT = 200;

export type ThreadingPipelineResult = {
  scannedCount: number;
  eligibleCount: number;
  skippedCount: number;
  eligibleEvents: {
    event: ActivityEvent;
    score: number;
    reasons: string[];
  }[];
};

export async function runThreadingPipeline({
  tenantId,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  limit = DEFAULT_LIMIT,
}: {
  tenantId: string;
  lookbackDays?: number;
  limit?: number;
}): Promise<ThreadingPipelineResult> {
  const now = new Date();
  const since = subDays(now, lookbackDays);
  const events = await getUnthreadedActivityEvents({
    tenantId,
    since,
    limit,
  });

  const eligibleEvents: ThreadingPipelineResult['eligibleEvents'] = [];
  let skippedCount = 0;

  for (const event of events) {
    const decision = evaluateThreadCandidate(event);

    if (!decision.eligible) {
      skippedCount += 1;
      continue;
    }

    eligibleEvents.push({
      event,
      score: decision.score,
      reasons: decision.reasons,
    });
  }
  console.log('eligible, skipped', eligibleEvents.length, skippedCount);

  const eligible = eligibleEvents.map((e) => e.event);
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

  const finalEvents = eligible
    .map((e) => shapeEventForLLM(e, prSummariesByPrId, prIdsByReviewId))
    .filter((e) => !!e);
  const existingThreads = await getExistingThreadsForThreading({ tenantId });
  console.log('existingThreads', existingThreads);
  const assignInput: AssignThreadsInput = {
    mode: existingThreads.length ? 'incremental' : 'cold_start',
    events: finalEvents,
    existingThreads,
  };
  console.log('assign input', assignInput);

  const rawAssignResponse = await assignThreads(assignInput);
  console.log('raw resp', rawAssignResponse);
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

  const { createdThreads, insertedThreadEvents } =
    await persistThreadAssignments({
      tenantId,
      candidateEvents: eligible.map((e) => ({
        id: e.id,
        occurredAt: e.occurredAt,
      })),
      llmOutput: assignResponse,
    });

  const summaryInputs = buildThreadSummaryInputs({
    finalEvents,
    createdThreads,
    insertedThreadEvents,
    existingThreads,
  });

  const results = await mapWithConcurrency(summaryInputs, 3, async (input) => {
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
      // TODO: also save the update/summary from last time
      await persistThreadSummary({
        tenantId,
        threadId: input.threadId,
        output: v.value,
        llm: {
          model: AiConfig.models.summarize,
          promptVersion: '1',
        },
      });
      return v.value;
    } catch (e: any) {
      throw new Error(`Error in thread summaries ${e.message}`);
    }
  });

  return {
    scannedCount: events.length,
    eligibleCount: eligibleEvents.length,
    skippedCount,
    eligibleEvents,
  };
}
