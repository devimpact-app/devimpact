import { db } from '@/lib/db/client';
import {
  activityEvents,
  threadEvents,
  threads,
  threadSummaryBullets,
} from '@/lib/db/schema/activity';
import { and, asc, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import {
  ExistingThreadContext,
  ThreadEventSample,
  ThreadSummaryBulletInput,
} from '../../service/llm/assign/types';
import { isBulletEditable } from '../../helpers';

const RECENT_EVENTS_PER_THREAD = 4;

function coerceSampleKind(
  meta: any,
  eventType: string
): 'pr' | 'review' | 'meeting' {
  const k = meta?.kind;
  if (k === 'pr' || k === 'review' || k === 'meeting') return k;
  if (eventType.includes('review')) return 'review';
  if (eventType.includes('meeting')) return 'meeting';
  return 'pr';
}

function toThreadEventSample(row: {
  occurredAt: Date;
  title: string;
  subtitle: string | null;
  repoFullName: string | null;
  prNumber: number | null;
  eventType: string;
  metadata: any;
}): ThreadEventSample {
  const meta = row.metadata;
  const kind = coerceSampleKind(meta, row.eventType);

  const meetingCategory =
    kind === 'meeting' ? meta?.classification?.category : undefined;
  const meetingSubtype =
    kind === 'meeting' ? meta?.classification?.categorySubtype : undefined;

  return {
    kind,
    occurredAt: row.occurredAt.toISOString(),
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    repo: row.repoFullName ?? undefined,
    prNumber: row.prNumber ?? undefined,
    meetingCategory,
    meetingSubtype,
  };
}

export async function getExistingThreadsForThreading({
  tenantId,
  limit = 25,
  activeSinceDays = 90,
}: {
  tenantId: string;
  limit?: number;
  activeSinceDays?: number;
}): Promise<ExistingThreadContext[]> {
  const since = new Date(Date.now() - activeSinceDays * 24 * 60 * 60 * 1000);

  const baseWhere = and(
    eq(threads.tenantId, tenantId),
    eq(threads.status, 'active')
  );

  const threadRows = await db
    .select({
      id: threads.id,
      categoryKey: threads.categoryKey,
      title: threads.title,
      summaryHeadline: threads.summaryHeadline,
      firstActivityAt: threads.firstActivityAt,
      lastActivityAt: threads.lastActivityAt,
    })
    .from(threads)
    .where(and(baseWhere, gt(threads.lastActivityAt, since)))
    .orderBy(desc(threads.lastActivityAt), desc(threads.updatedAt))
    .limit(limit);

  if (!threadRows.length) return [];

  const threadIds = threadRows.map((t) => t.id);

  const eventRows = await db
    .select({
      threadId: threadEvents.threadId,
      occurredAt: activityEvents.occurredAt,
      title: activityEvents.title,
      subtitle: activityEvents.subtitle,
      repoFullName: activityEvents.repoFullName,
      prNumber: activityEvents.prNumber,
      eventType: activityEvents.eventType,
      metadata: activityEvents.metadata,
    })
    .from(threadEvents)
    .innerJoin(
      activityEvents,
      eq(activityEvents.id, threadEvents.activityEventId)
    )
    .where(
      and(
        eq(threadEvents.tenantId, tenantId),
        inArray(threadEvents.threadId, threadIds),
        eq(activityEvents.tenantId, tenantId)
      )
    )
    .orderBy(asc(threadEvents.threadId), desc(activityEvents.occurredAt));

  const recentByThreadId = new Map<string, ThreadEventSample[]>();

  for (const row of eventRows) {
    const tid = row.threadId;
    const arr = recentByThreadId.get(tid) ?? [];
    if (arr.length >= RECENT_EVENTS_PER_THREAD) continue;
    arr.push(toThreadEventSample(row));
    recentByThreadId.set(tid, arr);
  }

  const bulletRows = await db
    .select({
      id: threadSummaryBullets.id,
      threadId: threadSummaryBullets.threadId,
      sortIndex: threadSummaryBullets.sortIndex,
      text: threadSummaryBullets.text,
      referencedEventIds: threadSummaryBullets.referencedEventIds,
      source: threadSummaryBullets.source,
      userEditedAt: threadSummaryBullets.userEditedAt,
      deletedAt: threadSummaryBullets.deletedAt,
    })
    .from(threadSummaryBullets)
    .where(
      and(
        eq(threadSummaryBullets.tenantId, tenantId),
        inArray(threadSummaryBullets.threadId, threadIds),
        isNull(threadSummaryBullets.deletedAt)
      )
    )
    .orderBy(
      asc(threadSummaryBullets.threadId),
      asc(threadSummaryBullets.sortIndex)
    );

  const bulletsByThreadId = new Map<string, ThreadSummaryBulletInput[]>();
  for (const b of bulletRows) {
    const editable = isBulletEditable(b);
    const item: ThreadSummaryBulletInput = {
      id: b.id,
      sortIndex: b.sortIndex,
      text: b.text,
      referencedEventIds: b.referencedEventIds ?? [],
      editable,
    };
    const arr = bulletsByThreadId.get(b.threadId) ?? [];
    arr.push(item);
    bulletsByThreadId.set(b.threadId, arr);
  }

  return threadRows.map((r) => ({
    id: r.id,
    categoryKey: r.categoryKey,
    title: r.title,
    summaryHeadline: r.summaryHeadline ?? '',
    bullets: bulletsByThreadId.get(r.id) ?? [],
    firstActivityAt: r.firstActivityAt ? r.firstActivityAt.toISOString() : null,
    lastActivityAt: r.lastActivityAt ? r.lastActivityAt.toISOString() : null,
    recentEventSamples: recentByThreadId.get(r.id) ?? [],
  }));
}
