import { db } from '@/lib/db/client';
import { activityEvents, type ActivityEvent } from '@/lib/db/schema/activity';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';

export type ActivityEventDbRow = {
  eventId: string;
  occurredAt: Date;
  endAt: Date | null;
  title: string;
  subtitle: string | null;
  url: string | null;
  repoFullName: string | null;
  prNumber: number | null;
  metadata: ActivityEvent['metadata'] | null;
  source: ActivityEvent['source'];
  sourceEntityTable: string;
  sourceEntityId: string;
};

export type ListThreadEventsParams = {
  tenantId: string;
  eventIds: string[];
  limit: number;
};

export type ListThreadEventsResult = {
  rows: ActivityEventDbRow[];
};

export async function listEventsById(
  params: ListThreadEventsParams
): Promise<ListThreadEventsResult> {
  const { tenantId, eventIds, limit } = params;

  let eventsWhere = and(
    eq(activityEvents.tenantId, tenantId),
    inArray(activityEvents.id, eventIds)
  );

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
      source: activityEvents.source,
      sourceEntityTable: activityEvents.sourceEntityTable,
      sourceEntityId: activityEvents.sourceEntityId,
    })
    .from(activityEvents)
    .where(eventsWhere)
    .orderBy(desc(activityEvents.occurredAt), desc(activityEvents.id))
    .limit(limit);

  return { rows: eventRows };
}
