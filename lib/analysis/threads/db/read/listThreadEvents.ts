import {
  activityEvents,
  threadEvents,
  type ActivityEvent,
} from '@/lib/db/schema/activity';
import { and, desc, eq, lt, or } from 'drizzle-orm';

export type ThreadEventDbRow = {
  eventId: string;
  occurredAt: Date;
  endAt: Date | null;
  title: string;
  subtitle: string | null;
  url: string | null;
  repoFullName: string | null;
  prNumber: number | null;
  metadata: ActivityEvent['metadata'] | null;
  assignedBy: 'llm' | 'user' | 'heuristic';
  assignmentConfidence: number | null;
  assignmentReason: string | null;
  assignedAt: Date;
  source: ActivityEvent['source'];
  sourceEntityTable: string;
  sourceEntityId: string;
};

export type ListThreadEventsParams = {
  tenantId: string;
  threadId: string;
  limit: number;
  cursor?: string | null;
};

export type ListThreadEventsResult = {
  rows: ThreadEventDbRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function listThreadEvents(
  params: ListThreadEventsParams
): Promise<ListThreadEventsResult> {
  const { tenantId, threadId, limit, cursor } = params;

  let eventsWhere = and(
    eq(threadEvents.tenantId, tenantId),
    eq(threadEvents.threadId, threadId),
    eq(activityEvents.tenantId, tenantId)
  );

  if (cursor) {
    const decoded = decodeActivityEventCursor(cursor);
    if (!decoded) {
      throw new Error('invalid_cursor');
    }

    eventsWhere = and(
      eventsWhere,
      or(
        lt(activityEvents.occurredAt, decoded.occurredAt),
        and(
          eq(activityEvents.occurredAt, decoded.occurredAt),
          lt(activityEvents.id, decoded.eventId)
        )
      )
    ) as any;
  }

  const eventRows = await db
    .select({
      eventId: activityEvents.id,
      occurredAt: activityEvents.occurredAt,
      endAt: activityEvents.endAt,
      title: activityEvents.title,
      subtitle: activityEvents.subtitle,
      url: activityEvents.url,
      repoFullName: activityEvents.repoFullName,
      prNumber: activityEvents.prNumber,
      metadata: activityEvents.metadata,
      assignedBy: threadEvents.assignedBy,
      assignmentConfidence: threadEvents.assignmentConfidence,
      assignmentReason: threadEvents.assignmentReason,
      assignedAt: threadEvents.createdAt,
      source: activityEvents.source,
      sourceEntityTable: activityEvents.sourceEntityTable,
      sourceEntityId: activityEvents.sourceEntityId,
    })
    .from(threadEvents)
    .innerJoin(
      activityEvents,
      and(
        eq(activityEvents.id, threadEvents.activityEventId),
        eq(activityEvents.tenantId, threadEvents.tenantId)
      )
    )
    .where(eventsWhere)
    .orderBy(desc(activityEvents.occurredAt), desc(activityEvents.id))
    .limit(limit + 1);

  const hasMore = eventRows.length > limit;
  const pageRows = hasMore ? eventRows.slice(0, limit) : eventRows;

  const nextCursor =
    hasMore && pageRows[pageRows.length - 1]
      ? encodeActivityEventCursor(
          pageRows[pageRows.length - 1].occurredAt.toISOString(),
          pageRows[pageRows.length - 1].eventId
        )
      : null;

  return { rows: pageRows, nextCursor, hasMore };
}
