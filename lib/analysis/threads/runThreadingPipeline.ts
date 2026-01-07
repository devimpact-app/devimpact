import { subDays } from 'date-fns';
import { getUnthreadedActivityEvents } from './queries/getUnthreadedActivityEvents';
import { evaluateThreadCandidate } from './policy/threadCandidatePolicy';
import type { ActivityEvent } from '@/lib/db/schema/activity';

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

  // 4. TODO: Group eligible events into thread candidates (LLM)
  // 5. TODO: Persist threads
  // 6. TODO: Persist thread_events joins
  // 7. TODO: Idempotency / re-run safety

  return {
    scannedCount: events.length,
    eligibleCount: eligibleEvents.length,
    skippedCount,
    eligibleEvents,
  };
}
