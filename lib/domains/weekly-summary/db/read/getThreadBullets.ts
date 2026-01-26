import { db } from '@/lib/db/client';
import { threadSummaryBullets } from '@/lib/db/schema/activity';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

export type ThreadBulletRow = {
  id: string;
  threadId: string;
  sortIndex: number;
  text: string;
  referencedEventIds: string[];
  editable: boolean;
  deletedAt: Date | null;
  generatedAt: Date | null;
};

export async function getThreadSummaryBulletsForThreads({
  tenantId,
  threadIds,
  perThreadLimit = 8,
  includeDeleted = false,
}: {
  tenantId: string;
  threadIds: string[];
  perThreadLimit?: number;
  includeDeleted?: boolean;
}): Promise<Record<string, ThreadBulletRow[]>> {
  if (threadIds.length === 0) return {};

  const where = and(
    eq(threadSummaryBullets.tenantId, tenantId),
    inArray(threadSummaryBullets.threadId, threadIds),
    includeDeleted ? undefined : isNull(threadSummaryBullets.deletedAt)
  );

  const rows = await db
    .select({
      id: threadSummaryBullets.id,
      threadId: threadSummaryBullets.threadId,
      sortIndex: threadSummaryBullets.sortIndex,
      text: threadSummaryBullets.text,
      referencedEventIds: threadSummaryBullets.referencedEventIds,
      deletedAt: threadSummaryBullets.deletedAt,
      generatedAt: threadSummaryBullets.generatedAt,
      userEditedAt: threadSummaryBullets.userEditedAt,
      source: threadSummaryBullets.source,
    })
    .from(threadSummaryBullets)
    .where(where)
    .orderBy(
      asc(threadSummaryBullets.threadId),
      asc(threadSummaryBullets.sortIndex)
    );

  const out: Record<string, ThreadBulletRow[]> = {};
  for (const r of rows) {
    const editable = r.source !== 'user' && !r.userEditedAt; // matches your earlier “editable” rule
    const bucket = (out[r.threadId] ??= []);
    if (bucket.length >= perThreadLimit) continue;

    bucket.push({
      id: r.id,
      threadId: r.threadId,
      sortIndex: r.sortIndex,
      text: r.text,
      referencedEventIds: (r.referencedEventIds ?? []) as string[],
      deletedAt: r.deletedAt ?? null,
      generatedAt: r.generatedAt ?? null,
      editable,
    });
  }

  for (const id of threadIds) out[id] ??= [];

  return out;
}
