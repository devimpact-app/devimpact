import { db } from '@/lib/db/client';
import {
  activityEvents,
  Thread,
  threadEvents,
  threads,
} from '@/lib/db/schema/activity';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';

export type WeeklyActiveThreadRow = {
  id: string;
  categoryKey: Thread['categoryKey'];
  title: string;
  summary: string;
  summaryHeadline: string;
  status: Thread['status'];
  confidence: number | null;
  firstActivityAt: Date | null;
  lastActivityAt: Date | null;
  weekEventCount: number;
  weekLastActivityAt: Date;
  eventCountPr: number;
  eventCountReview: number;
  eventCountMeeting: number;
  eventCountOoo: number;
};

export async function getActiveThreadsForWeek({
  tenantId,
  weekStartUtc,
  weekEndUtc,
  limit = 12,
}: {
  tenantId: string;
  weekStartUtc: Date;
  weekEndUtc: Date;
  limit?: number;
}): Promise<WeeklyActiveThreadRow[]> {
  // Threads are "active in week" if they have >=1 activity_event in the window.
  // We order by latest activity within the window, then by count as a tiebreaker.
  const rows = await db
    .select({
      id: threads.id,
      categoryKey: threads.categoryKey,
      title: threads.title,
      summary: threads.summary,
      summaryHeadline: threads.summaryHeadline,
      status: threads.status,
      confidence: threads.confidence,
      firstActivityAt: threads.firstActivityAt,
      lastActivityAt: threads.lastActivityAt,
      weekEventCount: sql<number>`count(${activityEvents.id})`.mapWith(Number),
      weekLastActivityAt: sql<Date>`max(${activityEvents.occurredAt})`,
      eventCountPr:
        sql<number>`count(*) filter (where ${activityEvents.eventType} = 'pr_merged')`.mapWith(
          Number
        ),
      eventCountReview:
        sql<number>`count(*) filter (where ${activityEvents.eventType} = 'review_submitted')`.mapWith(
          Number
        ),
      eventCountMeeting:
        sql<number>`count(*) filter (where ${activityEvents.eventType} = 'meeting_attended')`.mapWith(
          Number
        ),
      eventCountOoo:
        sql<number>`count(*) filter (where ${activityEvents.eventType} = 'ooo')`.mapWith(
          Number
        ),
    })
    .from(threads)
    .innerJoin(
      threadEvents,
      and(
        eq(threadEvents.tenantId, threads.tenantId),
        eq(threadEvents.threadId, threads.id)
      )
    )
    .innerJoin(
      activityEvents,
      and(
        eq(activityEvents.tenantId, threadEvents.tenantId),
        eq(activityEvents.id, threadEvents.activityEventId)
      )
    )
    .where(
      and(
        eq(threads.tenantId, tenantId),
        eq(threads.status, 'active'),
        gte(activityEvents.occurredAt, weekStartUtc),
        lt(activityEvents.occurredAt, weekEndUtc)
      )
    )
    .groupBy(
      threads.id,
      threads.categoryKey,
      threads.title,
      threads.summary,
      threads.summaryHeadline,
      threads.status,
      threads.confidence,
      threads.firstActivityAt,
      threads.lastActivityAt
    )
    .orderBy(
      desc(sql`max(${activityEvents.occurredAt})`),
      desc(sql`count(${activityEvents.id})`),
      desc(threads.id)
    )
    .limit(limit);

  return rows;
}
