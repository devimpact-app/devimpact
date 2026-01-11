import { NextRequest } from 'next/server';
import { and, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  activityEvents,
  threadEvents,
  threads,
} from '@/lib/db/schema/activity';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '../_lib/http';
import {
  GetThreadsResponseSchema,
  ThreadCategorySchema,
  ThreadEventPreview,
  ThreadStatusSchema,
} from '@/types/api/threads';
import { subDays } from 'date-fns';

function encodeCursor(sortAtIso: string, id: string) {
  return `${sortAtIso}__${id}`;
}

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const tenantId = session.user.id;

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const lookbackDaysParam = searchParams.get('lookbackDays');
  const limitParam = searchParams.get('limit');
  const statusParam = searchParams.get('status'); // active|archived
  const categoryParam = searchParams.get('category'); // features|tech_debt|...

  const limitRaw = limitParam ? Number(limitParam) : 20;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : 20;

  let where = eq(threads.tenantId, tenantId);

  const status =
    statusParam && ThreadStatusSchema.safeParse(statusParam).success
      ? statusParam
      : 'active';

  const lookbackDays = lookbackDaysParam ? Number(lookbackDaysParam) : 90;
  const since = subDays(new Date(), lookbackDays);
  where = and(where, gte(threads.lastActivityAt, since)) as any;

  where = and(
    where,
    eq(threads.status, status as 'active' | 'archived')
  ) as any;

  if (categoryParam) {
    const parsedCat = ThreadCategorySchema.safeParse(categoryParam);
    if (!parsedCat.success) return jsonBadRequest('Invalid category');
    where = and(where, eq(threads.categoryKey, parsedCat.data)) as any;
  }
  const sortAtExpr = sql<Date>`coalesce(${threads.lastActivityAt}, ${threads.createdAt})`;
  const eventKindExpr = sql<string>`coalesce(${activityEvents.metadata}->>'kind', '')`;
  const eventCountTotalExpr = sql<number>`count(${threadEvents.id})::int`;
  const prCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'pr' then 1 else 0 end)::int`;
  const reviewCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'review' then 1 else 0 end)::int`;
  const meetingCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'meeting' then 1 else 0 end)::int`;
  const oooCountExpr = sql<number>`sum(case when ${eventKindExpr} = 'ooo' then 1 else 0 end)::int`;
  const rows = await db
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
      createdAt: threads.createdAt,
      sortAt: sortAtExpr,

      eventCountTotal: eventCountTotalExpr,
      prCount: prCountExpr,
      reviewCount: reviewCountExpr,
      meetingCount: meetingCountExpr,
      oooCount: oooCountExpr,
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
    .where(where)
    .groupBy(threads.id)
    .orderBy(desc(sortAtExpr), desc(threads.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const pageThreadIds = pageRows.map((r) => r.id);
  let lastEventsByThreadId: Record<string, ThreadEventPreview> = {};

  if (pageThreadIds.length) {
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

    lastEventsByThreadId = Object.fromEntries(
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

  const threadsOut = pageRows.map((r) => {
    const le = lastEventsByThreadId[r.id] ?? null;
    return {
      id: r.id,
      categoryKey: r.categoryKey,
      title: r.title,
      titleUserEditedAt: r.titleUserEditedAt,
      summaryHeadline: r.summaryHeadline ?? '',
      headlineUserEditedAt: r.headlineUserEditedAt,
      status: r.status,
      confidence: r.confidence ?? null,
      firstActivityAt: r.firstActivityAt?.toISOString?.() ?? null,
      lastActivityAt: r.lastActivityAt?.toISOString?.() ?? null,
      userEditedAt: r.userEditedAt?.toISOString?.() ?? null,
      lastUpdate: r.lastUpdate
        ? {
            ...r.lastUpdate,
            generatedAt: new Date(r.lastUpdate.generatedAt).toISOString(),
          }
        : null,
      eventCountTotal: r.eventCountTotal ?? 0,
      eventCountsByKind: {
        pr: r.prCount ?? 0,
        review: r.reviewCount ?? 0,
        meeting: r.meetingCount ?? 0,
        ooo: r.oooCount ?? 0,
      },
      lastEvent: le,
    };
  });

  const nextCursor =
    hasMore && pageRows[pageRows.length - 1]
      ? encodeCursor(
          new Date(pageRows[pageRows.length - 1].sortAt).toISOString(),
          pageRows[pageRows.length - 1].id
        )
      : null;

  const parsed = GetThreadsResponseSchema.safeParse({
    threads: threadsOut,
    nextCursor,
  });

  if (!parsed.success) {
    return jsonBadRequest('Failed to parse threads response');
  }

  return jsonOK(parsed.data);
});
