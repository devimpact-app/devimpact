import { db } from '@/lib/db/client';
import { threads } from '@/lib/db/schema/activity';
import { and, desc, eq } from 'drizzle-orm';
import { ExistingThreadContext } from '../llm/types';

export async function getExistingThreadsForThreading({
  tenantId,
  limit = 50,
}: {
  tenantId: string;
  limit?: number;
}): Promise<ExistingThreadContext[]> {
  const rows = await db
    .select({
      id: threads.id,
      categoryKey: threads.categoryKey,
      title: threads.title,
      summary: threads.summary,
      firstActivityAt: threads.firstActivityAt,
      lastActivityAt: threads.lastActivityAt,
    })
    .from(threads)
    .where(and(eq(threads.tenantId, tenantId), eq(threads.status, 'active')))
    .orderBy(desc(threads.lastActivityAt), desc(threads.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    categoryKey: r.categoryKey,
    title: r.title,
    summary: r.summary ?? '',
    firstActivityAt: r.firstActivityAt
      ? r.firstActivityAt.toISOString()
      : undefined,
    lastActivityAt: r.lastActivityAt
      ? r.lastActivityAt.toISOString()
      : undefined,
  }));
}
