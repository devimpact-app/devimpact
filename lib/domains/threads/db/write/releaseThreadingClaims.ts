import { db } from '@/lib/db/client';
import { activityEvents } from '@/lib/db/schema/activity';
import { and, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

export async function releaseThreadingClaims({
  tenantId,
  eventIds,
  claimedBy,
  now = new Date(),
  errorMessage,
  tx,
}: {
  tenantId: string;
  eventIds: string[];
  claimedBy: string;
  now?: Date;
  errorMessage?: string;
  tx?: typeof db;
}) {
  if (!eventIds.length) return;

  const runner = tx ?? db;

  await runner
    .update(activityEvents)
    .set({
      threadingClaimedAt: null,
      threadingClaimedBy: null,
      threadingClaimExpiresAt: null,
      threadingState: 'unprocessed',
      threadingAttempts: sql`${activityEvents.threadingAttempts} + 1`,
      threadingLastAttemptAt: now,
      threadingLastDecision: !!errorMessage
        ? 'processing_error'
        : activityEvents.threadingLastDecision,
      threadingLastDecisionReason: errorMessage
        ? errorMessage.slice(0, 500)
        : activityEvents.threadingLastDecisionReason,
    })
    .where(
      and(
        eq(activityEvents.tenantId, tenantId),
        eq(activityEvents.threadingClaimedBy, claimedBy),
        inArray(activityEvents.id, eventIds)
      )
    );
}
