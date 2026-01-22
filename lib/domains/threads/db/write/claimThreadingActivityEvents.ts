import { db } from '@/lib/db/client';
import { activityEvents } from '@/lib/db/schema/activity';
import { and, asc, eq, gt, inArray, lte, lt, or, desc } from 'drizzle-orm';
import type { ActivityEvent } from '@/lib/db/schema/activity';

export async function claimThreadingActivityEvents({
  tenantId,
  since,
  end,
  limit = 50,
  claimedBy = 'threading_pipeline_v1',
  claimTtlMs = 5 * 60 * 1000, // 5 minutes
  order = 'asc',
}: {
  tenantId: string;
  since: Date;
  end: Date;
  limit?: number;
  claimedBy?: string;
  claimTtlMs?: number;
  order?: 'asc' | 'desc';
}): Promise<ActivityEvent[]> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + claimTtlMs);

  const orderBy =
    order === 'desc'
      ? [desc(activityEvents.occurredAt), desc(activityEvents.id)]
      : [asc(activityEvents.occurredAt), asc(activityEvents.id)];
  return db.transaction(async (tx) => {
    const picked = await tx
      .select({ id: activityEvents.id })
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          gt(activityEvents.occurredAt, since),
          lte(activityEvents.occurredAt, end),
          or(
            eq(activityEvents.threadingState, 'unprocessed'),
            and(
              eq(activityEvents.threadingState, 'in_progress'),
              // reclaim expired claims
              lt(activityEvents.threadingClaimExpiresAt, now)
            )
          )
        )
      )
      .orderBy(...orderBy)
      .limit(limit);

    const ids = picked.map((r) => r.id);
    if (!ids.length) return [];

    await tx
      .update(activityEvents)
      .set({
        threadingState: 'in_progress',
        threadingClaimedAt: now,
        threadingClaimedBy: claimedBy,
        threadingClaimExpiresAt: expiresAt,
      })
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          inArray(activityEvents.id, ids)
        )
      );

    const claimed = await tx
      .select()
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.tenantId, tenantId),
          inArray(activityEvents.id, ids)
        )
      )
      .orderBy(...orderBy);

    return claimed;
  });
}
