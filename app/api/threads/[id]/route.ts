import { NextRequest } from 'next/server';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../_lib/http';
import {
  activityEvents,
  threadEvents,
  threads,
} from '@/lib/db/schema/activity';
import {
  GetThreadDetailResponse,
  GetThreadDetailResponseSchema,
  ThreadEventListItem,
} from '@/types/api/threads';

function encodeCursor(occurredAtIso: string, eventId: string) {
  return `${occurredAtIso}__${eventId}`;
}

function decodeCursor(cursor: string) {
  const [occurredAtIso, eventId] = cursor.split('__');
  if (!occurredAtIso || !eventId) return null;

  const occurredAt = new Date(occurredAtIso);
  if (Number.isNaN(occurredAt.getTime())) return null;

  return { occurredAt, eventId };
}

export const GET = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const tenantId = session.user.id;
    const params = await context.params;
    const threadId = params.id;

    const url = new URL(req.url);
    const sp = url.searchParams;

    const limitParam = sp.get('limit');
    const cursor = sp.get('cursor');

    const limitRaw = limitParam ? Number(limitParam) : 50;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;

    const threadRow = await db
      .select({
        id: threads.id,
        categoryKey: threads.categoryKey,
        title: threads.title,
        summary: threads.summary,
        status: threads.status,
        confidence: threads.confidence,
        firstActivityAt: threads.firstActivityAt,
        lastActivityAt: threads.lastActivityAt,
        userEditedAt: threads.userEditedAt,
        lastUpdate: threads.lastUpdate,
        createdAt: threads.createdAt,
        updatedAt: threads.updatedAt,
      })
      .from(threads)
      .where(and(eq(threads.tenantId, tenantId), eq(threads.id, threadId)))
      .limit(1);

    if (!threadRow.length) {
      return jsonNotFound('Thread not found');
    }

    const t = threadRow[0];

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

    const c = counts[0] ?? {
      eventCountTotal: 0,
      pr: 0,
      review: 0,
      meeting: 0,
      ooo: 0,
    };

    let eventsWhere = and(
      eq(threadEvents.tenantId, tenantId),
      eq(threadEvents.threadId, threadId),
      eq(activityEvents.tenantId, tenantId)
    );

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) return jsonBadRequest('Invalid cursor');
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

    const events: ThreadEventListItem[] = pageRows.map((r) => {
      const kind =
        (r.metadata as any)?.kind === 'pr' ||
        (r.metadata as any)?.kind === 'review' ||
        (r.metadata as any)?.kind === 'meeting' ||
        (r.metadata as any)?.kind === 'ooo'
          ? ((r.metadata as any).kind as 'pr' | 'review' | 'meeting' | 'ooo')
          : // TODO: consider a better fallback mapping (eventType/sourceEntityTable)
            ('pr' as const);

      return {
        eventId: r.eventId,
        kind,
        occurredAt: r.occurredAt.toISOString(),
        endAt: r.endAt?.toISOString?.() ?? null,
        title: r.title,
        subtitle: r.subtitle ?? null,
        url: r.url ?? null,
        repoFullName: r.repoFullName ?? null,
        prNumber: r.prNumber ?? null,
        assignment: {
          assignedBy: r.assignedBy,
          confidence: r.assignmentConfidence ?? null,
          reason: r.assignmentReason ?? null,
          createdAt: r.assignedAt?.toISOString?.() ?? undefined,
        },
        inspectorRef: {
          source: r.source,
          sourceEntityTable: r.sourceEntityTable as any,
          sourceEntityId: r.sourceEntityId,
        },
        metadata: (r.metadata as any) ?? null,
      };
    });

    const nextCursor =
      hasMore && pageRows[pageRows.length - 1]
        ? encodeCursor(
            pageRows[pageRows.length - 1].occurredAt.toISOString(),
            pageRows[pageRows.length - 1].eventId
          )
        : null;

    const lastEvent = events.length > 0 ? events[0] : null;
    const out: GetThreadDetailResponse = {
      thread: {
        id: t.id,
        categoryKey: t.categoryKey,
        title: t.title,
        summary: t.summary ?? '',
        status: t.status,
        confidence: t.confidence ?? null,
        firstActivityAt: t.firstActivityAt?.toISOString?.() ?? null,
        lastActivityAt: t.lastActivityAt?.toISOString?.() ?? null,
        userEditedAt: t.userEditedAt?.toISOString?.() ?? null,
        lastUpdate: t.lastUpdate
          ? {
              ...t.lastUpdate,
              generatedAt: new Date(t.lastUpdate.generatedAt).toISOString(),
            }
          : null,
        lastEvent: lastEvent
          ? {
              eventId: lastEvent.eventId,
              kind: lastEvent.kind,
              occurredAt: lastEvent.occurredAt,
              title: lastEvent.title,
              subtitle: lastEvent.subtitle,
              url: lastEvent.url,
              repoFullName: lastEvent.repoFullName,
              prNumber: lastEvent.prNumber,
            }
          : null,
        eventCountTotal: Number(c.eventCountTotal ?? 0),
        eventCountsByKind: {
          pr: Number(c.pr ?? 0),
          review: Number(c.review ?? 0),
          meeting: Number(c.meeting ?? 0),
          ooo: Number(c.ooo ?? 0),
        },
      },
      events,
      nextCursor,
    };

    const parsed = GetThreadDetailResponseSchema.safeParse(out);
    if (!parsed.success) {
      console.log(parsed.error);
      return jsonBadRequest('Failed to parse thread detail response');
    }

    return jsonOK(parsed.data);
  }
);
