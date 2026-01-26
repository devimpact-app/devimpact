import { db } from '@/lib/db/client';
import { threads } from '@/lib/db/schema/activity';
import { and, eq } from 'drizzle-orm';

export async function getThreadById(args: {
  tenantId: string;
  threadId: string;
}) {
  const { tenantId, threadId } = args;

  const threadRow = await db
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
      updatedAt: threads.updatedAt,
    })
    .from(threads)
    .where(and(eq(threads.tenantId, tenantId), eq(threads.id, threadId)))
    .limit(1);

  return threadRow.length > 0 ? threadRow[0] : null;
}
