import { db } from '@/lib/db/client';
import { activityEvents, threadEvents } from '@/lib/db/schema/activity';
import { and, eq, sql } from 'drizzle-orm';

export async function getEventCountsForThread(args: {
  tenantId: string;
  threadId: string;
}) {
  const { tenantId, threadId } = args;

  const counts = await db
    .select({
      eventCountTotal: sql<number>`count(*)`.as('eventCountTotal'),
      pr: sql<number>`sum(case when (${activityEvents.metadata}->>'kind') = 'pr' then 1 else 0 end)`.as(
        'pr'
      ),
      review:
        sql<number>`sum(case when (${activityEvents.metadata}->>'kind') = 'review' then 1 else 0 end)`.as(
          'review'
        ),
      meeting:
        sql<number>`sum(case when (${activityEvents.metadata}->>'kind') = 'meeting' then 1 else 0 end)`.as(
          'meeting'
        ),
      ooo: sql<number>`sum(case when (${activityEvents.metadata}->>'kind') = 'ooo' then 1 else 0 end)`.as(
        'ooo'
      ),
    })
    .from(threadEvents)
    .innerJoin(
      activityEvents,
      and(
        eq(activityEvents.id, threadEvents.activityEventId),
        eq(activityEvents.tenantId, threadEvents.tenantId)
      )
    )
    .where(
      and(
        eq(threadEvents.tenantId, tenantId),
        eq(threadEvents.threadId, threadId)
      )
    )
    .limit(1);

  return (
    counts[0] ?? {
      eventCountTotal: 0,
      pr: 0,
      review: 0,
      meeting: 0,
      ooo: 0,
    }
  );
}
