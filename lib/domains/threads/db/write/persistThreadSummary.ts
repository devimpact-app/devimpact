import { db } from '@/lib/db/client';
import { threads, threadSummaryBullets } from '@/lib/db/schema/activity';
import { and, eq, inArray } from 'drizzle-orm';
import { ThreadSummaryOutput } from '../../service/llm/summaries/types';
import { dedupe, isBulletEditable, sameStringArray } from '../../helpers';

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
  const now = new Date();

  const outBullets = [...output.bullets]
    .map((b) => ({
      ...b,
      referencedEventIds: dedupe(b.referencedEventIds ?? []),
    }))
    .sort((a, b) => a.sortIndex - b.sortIndex);

  return await db.transaction(async (tx) => {
    const [t] = await tx
      .select()
      .from(threads)
      .where(and(eq(threads.tenantId, tenantId), eq(threads.id, threadId)))
      .limit(1);

    if (!t)
      throw new Error(`persistThreadSummary: thread not found ${threadId}`);

    const existingBulletRows = await tx
      .select()
      .from(threadSummaryBullets)
      .where(
        and(
          eq(threadSummaryBullets.tenantId, tenantId),
          eq(threadSummaryBullets.threadId, threadId)
        )
      );

    const existingById = new Map(existingBulletRows.map((b) => [b.id, b]));

    const titleLocked = !!t.titleUserEditedAt;
    const headlineLocked = !!t.headlineUserEditedAt;
    const nextTitle = titleLocked ? t.title : output.title;
    const nextHeadline = headlineLocked ? t.summaryHeadline : output.headline;

    // Update thread row
    await tx
      .update(threads)
      .set({
        title: nextTitle,
        summaryHeadline: nextHeadline,
        confidence: output.confidence,
        model: llm.model,
        lastUpdate: null,
        promptVersion: llm.promptVersion,
        updatedAt: now,
      })
      .where(and(eq(threads.tenantId, tenantId), eq(threads.id, threadId)));

    // Validate bullet output
    const outputBulletIds = new Set(
      outBullets.map((b) => b.bulletId).filter((x): x is string => Boolean(x))
    );

    for (const b of existingBulletRows) {
      const editable = isBulletEditable(b);
      if (!editable && !b.deletedAt) {
        // Non-editable and currently active must be present in output
        if (!outputBulletIds.has(b.id)) {
          throw new Error(
            `persistThreadSummary: llm_output_missing_locked_bullet:${b.id}`
          );
        }
      }
    }

    // Insert brand new bullets
    const toInsert = outBullets
      .filter((b) => !b.bulletId)
      .map((b) => ({
        tenantId,
        threadId,
        sortIndex: b.sortIndex,
        text: b.text,
        referencedEventIds: b.referencedEventIds ?? [],
        source: 'llm' as const,
        generatedAt: now,
        model: llm.model,
        promptVersion: llm.promptVersion,
      }));

    if (toInsert.length) {
      await tx.insert(threadSummaryBullets).values(toInsert);
    }

    // Loop for editing bullets
    for (const b of outBullets) {
      if (!b.bulletId) continue;
      const existing = existingById.get(b.bulletId);
      if (!existing) {
        throw new Error(
          `persistThreadSummary: unknown_bullet_id_in_output:${b.bulletId}`
        );
      }

      const editable = isBulletEditable(existing);

      // Only allow re-order if not editable
      if (!editable) {
        const sameText = existing.text === b.text;
        const sameRefs = sameStringArray(
          dedupe(existing.referencedEventIds ?? []),
          dedupe(b.referencedEventIds ?? [])
        );
        if (!sameText || !sameRefs) {
          throw new Error(
            `persistThreadSummary: attempted_edit_locked_bullet:${b.bulletId}`
          );
        }

        if (existing.sortIndex !== b.sortIndex) {
          await tx
            .update(threadSummaryBullets)
            .set({
              sortIndex: b.sortIndex,
              updatedAt: now,
            })
            .where(
              and(
                eq(threadSummaryBullets.tenantId, tenantId),
                eq(threadSummaryBullets.threadId, threadId),
                eq(threadSummaryBullets.id, b.bulletId)
              )
            );
        }
        continue;
      }

      // Editable can update everything
      await tx
        .update(threadSummaryBullets)
        .set({
          sortIndex: b.sortIndex,
          text: b.text,
          referencedEventIds: b.referencedEventIds ?? [],
          deletedAt: null,
          generatedAt: now,
          model: llm.model,
          promptVersion: llm.promptVersion,
          updatedAt: now,
        })
        .where(
          and(
            eq(threadSummaryBullets.tenantId, tenantId),
            eq(threadSummaryBullets.threadId, threadId),
            eq(threadSummaryBullets.id, b.bulletId)
          )
        );
    }

    // Handle soft deletion of bullets that aren't in output
    const allOutputIds = new Set(
      outBullets.map((b) => b.bulletId).filter((x): x is string => Boolean(x))
    );

    const toSoftDelete: string[] = [];
    for (const b of existingBulletRows) {
      if (b.deletedAt) continue;
      if (allOutputIds.has(b.id)) continue;
      const editable = isBulletEditable(b);
      if (!editable) {
        continue;
      }
      toSoftDelete.push(b.id);
    }

    if (toSoftDelete.length) {
      await tx
        .update(threadSummaryBullets)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(threadSummaryBullets.tenantId, tenantId),
            eq(threadSummaryBullets.threadId, threadId),
            inArray(threadSummaryBullets.id, toSoftDelete)
          )
        );
    }
  });
}
