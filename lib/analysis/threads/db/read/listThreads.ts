import { ThreadEventPreview, ThreadListItem } from '@/types/api/threads';
import { db } from '@/lib/db/client';
import {
  activityEvents,
  threadEvents,
  threads,
} from '@/lib/db/schema/activity';
import { and, asc, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import { getLastEventsByThreadId } from '@/lib/analysis/threads/db/read/getLastEventsByThreadId';
import { decodeThreadCursor, encodeThreadCursor } from './cursor';

export type ThreadListDbRow = {
  id: string;
  categoryKey: ThreadListItem['categoryKey'];
  title: string;
  titleUserEditedAt: Date | null;
  summaryHeadline: string | null;
  headlineUserEditedAt: Date | null;
  status: ThreadListItem['status'];
  confidence: number | null;
  firstActivityAt: Date | null;
  lastActivityAt: Date | null;
  userEditedAt: Date | null;
  lastUpdate: null | {
    headline?: string;
    bullets?: string[];
    referencedEventIds: string[];
    generatedAt: string;
  };
  eventCountTotal: number | null;
  prCount: number | null;
  reviewCount: number | null;
  meetingCount: number | null;
  oooCount: number | null;
};

export type ListThreadsParams = {
  tenantId: string;
  status: 'active' | 'archived';
  categoryKey?: string;
  since?: Date;
  limit: number;
  cursor?: string | null;
  threadIds?: string[];
  oldestFirst?: boolean;
};

export type ListThreadsResult = {
  rows: ThreadListDbRow[];
  total: number;
  nextCursor: string | null;
  lastEventsByThreadId: Record<string, ThreadEventPreview>;
};

export async function listThreadsDb(
  params: ListThreadsParams
): Promise<ListThreadsResult> {
  const { tenantId, status, categoryKey, since, limit, threadIds } = params;

  const limitClamped = Number.isFinite(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : 20;

  let baseWhere = and(
    eq(threads.tenantId, tenantId),
    eq(threads.status, status)
  );
  if (since) {
    baseWhere = and(baseWhere, gte(threads.lastActivityAt, since));
  }
  if (categoryKey) {
    baseWhere = and(baseWhere, eq(threads.categoryKey, categoryKey as any));
  }
  if (threadIds && threadIds.length > 0) {
    baseWhere = and(baseWhere, inArray(threads.id, threadIds));
  }

  const sortAtExpr = sql<Date>`coalesce(${threads.lastActivityAt}, ${threads.createdAt})`;
  const eventKindExpr = sql<string>`coalesce(${activityEvents.metadata}->>'kind', '')`;
  const eventCountTotalExpr = sql<number>`count(${threadEvents.id})::int`;
  const prCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'pr' then 1 else 0 end)::int`;
  const reviewCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'review' then 1 else 0 end)::int`;
  const meetingCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'meeting' then 1 else 0 end)::int`;
  const oooCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'ooo' then 1 else 0 end)::int`;

  let pageWhere = baseWhere;
  if (params.cursor) {
    const decoded = decodeThreadCursor(params.cursor);
    if (!decoded) {
      throw new Error('invalid_cursor');
    }
    pageWhere = and(
      pageWhere,
      or(
        lt(sortAtExpr, decoded.sortAt),
        and(eq(sortAtExpr, decoded.sortAt), lt(threads.id, decoded.id))
      )
    ) as any;
  }

  const pageRowsRaw = await db
    .select({
      id: threads.id,
      categoryKey: threads.categoryKey,
      title: threads.title,
      titleUserEditedAt: threads.titleUserEditedAt,
      summaryHeadline: threads.summaryHeadline,
      headlineUserEditedAt: threads.headlineUserEditedAt,
      status: threads.status,
      confidence: threads.confidence,
      firstActivityAt: threads.firstActivityAt,
      lastActivityAt: threads.lastActivityAt,
      userEditedAt: threads.userEditedAt,
      lastUpdate: threads.lastUpdate,
      eventCountTotal: eventCountTotalExpr,
      prCount: prCountExpr,
      reviewCount: reviewCountExpr,
      meetingCount: meetingCountExpr,
      oooCount: oooCountExpr,
      sortAt: sortAtExpr,
    })
    .from(threads)
    .leftJoin(
      threadEvents,
      and(
        eq(threadEvents.tenantId, threads.tenantId),
        eq(threadEvents.threadId, threads.id)
      )
    )
    .leftJoin(
      activityEvents,
      and(
        eq(activityEvents.tenantId, threadEvents.tenantId),
        eq(activityEvents.id, threadEvents.activityEventId)
      )
    )
    .where(pageWhere)
    .groupBy(threads.id)
    .orderBy(
      params.oldestFirst ? asc(sortAtExpr) : desc(sortAtExpr),
      desc(threads.id)
    )
    .limit(limitClamped + 1);

  const hasMore = pageRowsRaw.length > limitClamped;
  const pageRows = hasMore ? pageRowsRaw.slice(0, limitClamped) : pageRowsRaw;

  const nextCursor =
    hasMore && pageRows.length
      ? encodeThreadCursor(
          new Date(pageRows[pageRows.length - 1].sortAt).toISOString(),
          pageRows[pageRows.length - 1].id
        )
      : null;

  const totalRow = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(threads)
    .where(baseWhere)
    .limit(1);

  const total = Number(totalRow[0]?.total ?? 0);

  const pageThreadIds = pageRows.map((r) => r.id);
  const lastEventsByThreadId = pageThreadIds.length
    ? await getLastEventsByThreadId({ tenantId, pageThreadIds })
    : {};

  return {
    rows: pageRows,
    total,
    nextCursor,
    lastEventsByThreadId,
  };
}
