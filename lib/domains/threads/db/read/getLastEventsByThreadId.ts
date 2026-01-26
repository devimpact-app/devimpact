import { db } from '@/lib/db/client';
import { activityEvents, threadEvents } from '@/lib/db/schema/activity';
import { and, eq, inArray, sql } from 'drizzle-orm';

export async function getLastEventsByThreadId({
  tenantId,
  pageThreadIds,
}: {
  tenantId: string;
  pageThreadIds: string[];
}) {
  const ranked = db
    .select({
      threadId: threadEvents.threadId,
      eventId: activityEvents.id,
      occurredAt: activityEvents.occurredAt,
      title: activityEvents.title,
      subtitle: activityEvents.subtitle,
      url: activityEvents.url,
      repoFullName: activityEvents.repoFullName,
      prNumber: activityEvents.prNumber,
      metadata: activityEvents.metadata,
      rn: sql<number>`row_number() over (
            partition by ${threadEvents.threadId}
            order by ${activityEvents.occurredAt} desc, ${activityEvents.id} desc
          )`.as('rn'),
    })
    .from(threadEvents)
    .innerJoin(
      activityEvents,
      and(
        eq(activityEvents.tenantId, threadEvents.tenantId),
        eq(activityEvents.id, threadEvents.activityEventId)
      )
    )
    .where(
      and(
        eq(threadEvents.tenantId, tenantId),
        inArray(threadEvents.threadId, pageThreadIds)
      )
    )
    .as('ranked');

  const lastRows = await db
    .select({
      threadId: ranked.threadId,
      eventId: ranked.eventId,
      occurredAt: ranked.occurredAt,
      title: ranked.title,
      subtitle: ranked.subtitle,
      url: ranked.url,
      repoFullName: ranked.repoFullName,
      prNumber: ranked.prNumber,
      metadata: ranked.metadata,
    })
    .from(ranked)
    .where(eq(ranked.rn, 1));

  return Object.fromEntries(
    lastRows.map((r) => [
      r.threadId,
      {
        ...r,
        kind: r.metadata?.kind ?? 'pr',
        occurredAt: r.occurredAt.toISOString(),
      },
    ])
  );
}
