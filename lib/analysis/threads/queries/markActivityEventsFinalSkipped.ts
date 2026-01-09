import { db } from '@/lib/db/client';
import { activityEvents } from '@/lib/db/schema/activity';
import { and, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

type IneligibleDecision = {
  eventId: string;
  reasons: string[];
};

export async function markActivityEventsFinalSkipped({
  tenantId,
  decisions,
  now = new Date(),
  tx,
}: {
  tenantId: string;
  decisions: IneligibleDecision[];
  now?: Date;
  tx?: typeof db;
}) {
  if (!decisions.length) return;

  const runner = tx ?? db;

  const reasonById = new Map(decisions.map((d) => [d.eventId, d.reasons]));
  const ids = decisions.map((d) => d.eventId);

  // Build CASE expression so each row can store its own reason payload.
  const caseSql = sql.join(
    [
      sql`CASE ${activityEvents.id}`,
      ...decisions.map(
        (d) =>
          sql` WHEN ${d.eventId} THEN ${JSON.stringify(reasonById.get(d.eventId) ?? [])}`
      ),
      sql` ELSE ${activityEvents.threadingLastDecisionReason} END`,
    ],
    sql``
  );

  await runner
    .update(activityEvents)
    .set({
      threadingState: 'final_skipped',
      threadingLastDecision: 'policy_ineligible',
      threadingLastDecisionReason: caseSql,
      threadingAttempts: sql`${activityEvents.threadingAttempts} + 1`,
      threadingLastAttemptAt: now,
      // If the event was previously claimed/in-progress, clear the claim fields too.
      threadingClaimedAt: null,
      threadingClaimedBy: null,
      threadingClaimExpiresAt: null,
    })
    .where(
      and(
        eq(activityEvents.tenantId, tenantId),
        inArray(activityEvents.id, ids)
      )
    );
}
