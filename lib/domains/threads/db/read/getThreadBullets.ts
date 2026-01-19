import { db } from '@/lib/db/client';
import {
  ThreadSummaryBullet,
  threadSummaryBullets,
} from '@/lib/db/schema/activity';
import { and, asc, eq, isNull } from 'drizzle-orm';

export async function getThreadBullets(args: {
  tenantId: string;
  threadId: string;
}): Promise<ThreadSummaryBullet[]> {
  const { tenantId, threadId } = args;

  const where = and(
    eq(threadSummaryBullets.tenantId, tenantId),
    eq(threadSummaryBullets.threadId, threadId),
    isNull(threadSummaryBullets.deletedAt)
  );

  const rows = await db
    .select()
    .from(threadSummaryBullets)
    .where(where)
    .orderBy(
      asc(threadSummaryBullets.sortIndex),
      asc(threadSummaryBullets.createdAt)
    );

  return rows;
}
