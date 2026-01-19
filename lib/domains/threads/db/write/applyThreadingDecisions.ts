import { db } from '@/lib/db/client';
import { activityEvents } from '@/lib/db/schema/activity';
import { and, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { AssignThreadsOutput } from '../../service/llm/assign/types';

const MAX_REASON_LEN = 500;

function reasonsToString(reasons?: string[]) {
  if (!reasons?.length) return null;
  return reasons.join(',').slice(0, MAX_REASON_LEN);
}

export async function applyThreadingAssignments({
  tenantId,
  llmOutput,
  now,
  claimedBy,
  deferAfterAttempts = 2,
  tx,
}: {
  tenantId: string;
  llmOutput: AssignThreadsOutput;
  now: Date;
  claimedBy?: string;
  deferAfterAttempts?: number;
  tx?: typeof db;
}): Promise<{
  threadedCount: number;
  deferredCount: number;
}> {
  const runner = tx ?? db;

  const assigned = llmOutput.assignments
    .filter((a) => a.action === 'assign_existing' || a.action === 'create_new')
    .map((a) => a.eventId);

  const skipped = llmOutput.assignments
    .filter((a) => a.action === 'skip')
    .map((a) => a.eventId);

  const threadedCount = assigned.length;
  if (assigned.length) {
    await runner
      .update(activityEvents)
      .set({
        threadingState: 'threaded',
        threadingAttempts: sql`${activityEvents.threadingAttempts} + 1`,
        threadingLastAttemptAt: now,
        threadingLastDecision: 'threaded',
        threadingLastDecisionReason: null,

        threadingClaimedAt: null,
        threadingClaimedBy: null,
        threadingClaimExpiresAt: null,
      })
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          inArray(activityEvents.id, assigned),
          ...(claimedBy
            ? [eq(activityEvents.threadingClaimedBy, claimedBy as any)]
            : [])
        )
      );
  }

  const deferredCount = skipped.length;
  if (skipped.length) {
    // mark "skipped this run", release claim
    await runner
      .update(activityEvents)
      .set({
        threadingAttempts: sql`${activityEvents.threadingAttempts} + 1`,
        threadingLastAttemptAt: now,
        threadingLastDecision: 'skip',
        threadingLastDecisionReason: 'llm_skip',
        threadingClaimedAt: null,
        threadingClaimedBy: null,
        threadingClaimExpiresAt: null,
      })
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          inArray(activityEvents.id, skipped),
          ...(claimedBy
            ? [eq(activityEvents.threadingClaimedBy, claimedBy as any)]
            : [])
        )
      );

    // any that have now hit defer threshold => deferred + timestamp
    await runner
      .update(activityEvents)
      .set({
        threadingState: 'deferred',
        threadingDeferredAt: now,
      })
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          inArray(activityEvents.id, skipped),
          sql`${activityEvents.threadingAttempts} >= ${deferAfterAttempts}`
        )
      );

    // the rest remain retryable
    await runner
      .update(activityEvents)
      .set({
        threadingState: 'unprocessed',
      })
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          inArray(activityEvents.id, skipped),
          sql`${activityEvents.threadingAttempts} < ${deferAfterAttempts}`
        )
      );
  }

  return {
    threadedCount,
    deferredCount,
  };
}
