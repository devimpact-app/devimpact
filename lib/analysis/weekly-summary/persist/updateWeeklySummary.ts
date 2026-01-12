import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { WeeklySummaryOutput } from '../llm/types';
import { weeklySummaries } from '@/lib/db/schema/weekly-summary';

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function collectReferencedIdsFromOutput(output: WeeklySummaryOutput): {
  referencedThreadIds: string[];
  referencedEventIds: string[];
} {
  const threadIds: string[] = [];
  const eventIds: string[] = [];

  for (const b of output.bullets ?? []) {
    if (b.referencedThreadIds?.length) threadIds.push(...b.referencedThreadIds);
    if (b.referencedEventIds?.length) eventIds.push(...b.referencedEventIds);
  }

  return {
    referencedThreadIds: uniq(threadIds),
    referencedEventIds: uniq(eventIds),
  };
}

export async function markWeeklySummaryReadyFromLLM({
  tenantId,
  rowId,
  output,
  llm,
  now = new Date(),
}: {
  tenantId: string;
  rowId: string;
  output: WeeklySummaryOutput;
  llm: { model: string; promptVersion: string };
  now?: Date;
}) {
  const { referencedThreadIds, referencedEventIds } =
    collectReferencedIdsFromOutput(output);

  const where = and(
    eq(weeklySummaries.tenantId, tenantId),
    eq(weeklySummaries.id, rowId)
  );

  const updated = await db
    .update(weeklySummaries)
    .set({
      status: 'ready',
      output,
      referencedThreadIds,
      referencedEventIds,
      model: llm.model,
      promptVersion: llm.promptVersion,
      generatedAt: now,
      lastError: null,
      lastErrorAt: null,
      nextAttemptAt: null,
      claimedAt: null,
      claimedBy: null,
      claimExpiresAt: null,
      updatedAt: now,
    })
    .where(where)
    .returning();

  if (updated.length === 0) {
    throw new Error(
      `markWeeklySummaryReadyFromLLM: update_missed rowId=${rowId}`
    );
  }

  return updated[0];
}

export async function markWeeklySummaryFailed({
  tenantId,
  rowId,
  error,
  now = new Date(),
  backoffUntil,
}: {
  tenantId: string;
  rowId: string;
  error: string;
  now?: Date;
  backoffUntil?: Date | null;
}) {
  const updated = await db
    .update(weeklySummaries)
    .set({
      status: 'failed',
      lastError: error.slice(0, 4000),
      lastErrorAt: now,
      nextAttemptAt: backoffUntil ?? null,
      attempts: sql<number>`${weeklySummaries.attempts} + 1`,
      claimedAt: null,
      claimedBy: null,
      claimExpiresAt: null,
      updatedAt: now,
    })
    .where(
      and(eq(weeklySummaries.tenantId, tenantId), eq(weeklySummaries.id, rowId))
    )
    .returning();

  if (updated.length === 0) {
    throw new Error(`markWeeklySummaryFailed: update_missed rowId=${rowId}`);
  }

  return updated[0];
}

export async function markWeeklySummarySkipped({
  tenantId,
  rowId,
  now = new Date(),
}: {
  tenantId: string;
  rowId: string;
  now?: Date;
}) {
  const updated = await db
    .update(weeklySummaries)
    .set({
      status: 'skipped',
      lastError: null,
      lastErrorAt: null,
      nextAttemptAt: null,
      claimedAt: null,
      claimedBy: null,
      claimExpiresAt: null,
      updatedAt: now,
    })
    .where(
      and(eq(weeklySummaries.tenantId, tenantId), eq(weeklySummaries.id, rowId))
    )
    .returning();

  if (updated.length === 0) {
    throw new Error(`markWeeklySummarySkipped: update_missed rowId=${rowId}`);
  }

  return updated[0];
}
