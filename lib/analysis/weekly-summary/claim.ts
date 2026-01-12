import { db } from '@/lib/db/client';
import { weeklySummaries, WeeklySummary } from '@/lib/db/schema/weekly-summary';
import { WeeklySummaryStatus } from '@/types/api/weekly-summary';
import { and, eq } from 'drizzle-orm';

export type ClaimWeeklySummaryResult =
  | {
      action: 'proceed';
      row: WeeklySummary;
      reason:
        | 'created'
        | 'reusing_pending'
        | 'force_reprocess'
        | 'recovered_expired_processing'
        | 'retrying_error';
    }
  | {
      action: 'return_existing';
      row: WeeklySummary;
      reason: 'already_ready' | 'already_sent';
    }
  | {
      action: 'skip_in_progress';
      row: WeeklySummary;
      reason: 'processing_claim_active';
    }
  | {
      action: 'skip';
      row: WeeklySummary;
      reason: 'already_skipped';
    }
  | {
      action: 'skip_error';
      row: WeeklySummary;
      reason: 'error_backoff' | 'error_max_attempts';
      retryAfterMs?: number;
    };

export function computeBackoffMs(attempts: number) {
  const base = 30_000; // 30s
  const max = 30 * 60_000; // 30m
  const ms = Math.min(max, base * Math.pow(2, Math.max(0, attempts - 1)));
  return ms;
}

async function resetToPending({
  summaryId,
  reason,
  tx,
}: {
  summaryId: string;
  reason: ClaimWeeklySummaryResult['reason'];
  tx: typeof db;
}) {
  const [updated] = await tx
    .update(weeklySummaries)
    .set({
      status: 'pending',
      claimedAt: null,
      claimedBy: null,
      claimExpiresAt: null,
      lastError: null,
      nextAttemptAt: null,
      updatedAt: new Date(),
    })
    .where(eq(weeklySummaries.id, summaryId))
    .returning();

  return { action: 'proceed' as const, row: updated, reason };
}

export async function claimWeeklySummaryRow({
  tenantId,
  weekStartLocalDate, // YYYY-MM-DD in user's tz
  timezone,
  weekStart,
  weekEnd,
  now,
  force = false,
  maxAttempts = 5,
}: {
  tenantId: string;
  weekStartLocalDate: string;
  timezone: string;
  weekStart: Date; // UTC
  weekEnd: Date; // UTC
  now: Date;
  force?: boolean;
  maxAttempts?: number;
}): Promise<ClaimWeeklySummaryResult> {
  const result = await db.transaction(async (tx) => {
    // Lock row if it exists to prevent double creates/updates
    const existing = await tx
      .select()
      .from(weeklySummaries)
      .where(
        and(
          eq(weeklySummaries.tenantId, tenantId),
          eq(weeklySummaries.weekStartLocalDate, weekStartLocalDate),
          eq(weeklySummaries.timezone, timezone)
        )
      )
      .for('update');

    if (existing.length === 0) {
      const [created] = await tx
        .insert(weeklySummaries)
        .values({
          tenantId,
          timezone,
          weekStartLocalDate,
          rangeStartUtc: weekStart,
          rangeEndUtc: weekEnd,
          status: 'pending',
        })
        .returning();

      return { action: 'proceed', row: created, reason: 'created' };
    }

    const row = existing[0];
    const status = row.status as WeeklySummaryStatus;

    // If force, always reprocess unless it's actively processing
    if (force) {
      if (
        status === 'generating' &&
        row.claimExpiresAt &&
        row.claimExpiresAt > now
      ) {
        return {
          action: 'skip_in_progress',
          row,
          reason: 'processing_claim_active',
        };
      }
      return resetToPending({
        summaryId: row.id,
        reason: 'force_reprocess',
        tx,
      });
    }

    if (status === 'pending') {
      return { action: 'proceed', row, reason: 'reusing_pending' };
    }

    if (status === 'generating') {
      // If claim expired, recover it
      const expires = row.claimExpiresAt;
      if (expires && expires <= now) {
        return resetToPending({
          summaryId: row.id,
          reason: 'recovered_expired_processing',
          tx,
        });
      }
      return {
        action: 'skip_in_progress',
        row,
        reason: 'processing_claim_active',
      };
    }

    if (status === 'ready') {
      return { action: 'return_existing', row, reason: 'already_ready' };
    }

    if (status === 'failed') {
      const attempts = row.attempts ?? 0;
      if (attempts >= maxAttempts) {
        return { action: 'skip_error', row, reason: 'error_max_attempts' };
      }

      // Backoff gate
      const next = row.nextAttemptAt;
      if (next && next > now) {
        return {
          action: 'skip_error',
          row,
          reason: 'error_backoff',
          retryAfterMs: next.getTime() - now.getTime(),
        };
      }

      // Allow retry: set pending (or you could go straight to processing claim)
      const [updated] = await tx
        .update(weeklySummaries)
        .set({
          status: 'pending',
          updatedAt: now,
        })
        .where(eq(weeklySummaries.id, row.id))
        .returning();

      return { action: 'proceed', row: updated, reason: 'retrying_error' };
    }

    // Process skipped if manual force
    if (status === 'skipped') {
      if (force) {
        return resetToPending({
          summaryId: row.id,
          reason: 'force_reprocess',
          tx,
        });
      }
      return { action: 'skip', row: row, reason: 'already_skipped' };
    }
    return { action: 'return_existing', row, reason: 'already_ready' };
  });
  return result as ClaimWeeklySummaryResult;
}
