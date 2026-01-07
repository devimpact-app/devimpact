import { db } from '@/lib/db/client';
import { threads } from '@/lib/db/schema/activity';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { ThreadSummaryOutput } from '../llm/summaries/types';

export async function persistThreadSummary({
  tenantId,
  threadId,
  output,
  llm,
}: {
  tenantId: string;
  threadId: string;
  output: ThreadSummaryOutput;
  llm: { model: string; promptVersion: string };
}) {
  const [t] = await db
    .select({
      id: threads.id,
      userEditedAt: threads.userEditedAt,
      title: threads.title,
      summary: threads.summary,
    })
    .from(threads)
    .where(and(eq(threads.tenantId, tenantId), eq(threads.id, threadId)))
    .limit(1);

  if (!t) throw new Error(`persistThreadSummary: thread not found ${threadId}`);

  const userEdited = Boolean(t.userEditedAt);

  const nextTitle = userEdited ? t.title : output.title;
  const nextSummary = userEdited ? t.summary : output.summary;

  await db
    .update(threads)
    .set({
      title: nextTitle,
      summary: nextSummary,
      confidence: output.confidence,
      model: llm.model,
      lastUpdate: output.updates
        ? {
            ...output.updates,
            generatedAt: new Date().toISOString(),
          }
        : null,
      promptVersion: llm.promptVersion,
      updatedAt: new Date(),
    })
    .where(and(eq(threads.tenantId, tenantId), eq(threads.id, threadId)));
}
