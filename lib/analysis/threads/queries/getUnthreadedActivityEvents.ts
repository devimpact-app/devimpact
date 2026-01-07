import { db } from '@/lib/db/client';
import { activityEvents, threadEvents } from '@/lib/db/schema/activity';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { ActivityEvent } from '@/lib/db/schema/activity';

export async function getUnthreadedActivityEvents({
  tenantId,
  since,
  limit = 200,
}: {
  tenantId: string;
  since: Date;
  limit?: number;
}): Promise<ActivityEvent[]> {
  const rows = await db
    .select({
      activityEvent: activityEvents,
    })
    .from(activityEvents)
    .leftJoin(
      threadEvents,
      and(
        eq(threadEvents.activityEventId, activityEvents.id),
        eq(threadEvents.tenantId, activityEvents.tenantId)
      )
    )
    .where(
      and(
        eq(activityEvents.tenantId, tenantId),
        gt(activityEvents.occurredAt, since),
        isNull(threadEvents.id)
      )
    )
    .orderBy(desc(activityEvents.occurredAt))
    .limit(limit);

  return rows.map((r) => r.activityEvent);
}
