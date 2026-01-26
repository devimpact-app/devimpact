import { db } from '@/lib/db/client';
import { threads, threadSummaryBullets } from '@/lib/db/schema/activity';
import { and, asc, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import {
  ExistingThreadContext,
  ThreadSummaryBulletInput,
} from '../../service/llm/assign/types';
import { isBulletEditable } from '../../helpers';

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
  }));
}
