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

  const eligible = eligibleEvents.map((e) => e.event);
  const prEventIds = eligible
    .filter((e) => e.sourceEntityTable === 'pull_requests')
    .map((e) => e.sourceEntityId);
  const prSummariesByPrId = await getPrSummariesByPrIds(tenantId, prEventIds);

  const finalEvents = eligible
    .map((e) => shapeEventForLLM(e, prSummariesByPrId))
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

  const {} = await persistThreadAssignments({
    tenantId,
    candidateEvents: eligible.map((e) => ({
      id: e.id,
      occurredAt: e.occurredAt,
    })),
    llmOutput: assignResponse,
  });

  // TODO: do summaries of impacted threads new and existing

  return {
    scannedCount: events.length,
    eligibleCount: eligibleEvents.length,
    skippedCount,
    eligibleEvents,
  };
}
