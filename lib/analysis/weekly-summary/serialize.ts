import { WeeklySummary } from '@/lib/db/schema/weekly-summary';
import { toIso } from '@/lib/utils/date';
import { WeeklySummaryItem } from '@/types/api/weekly-summary';

export function serializeWeeklySummaryRow(
  row: WeeklySummary
): WeeklySummaryItem {
  return {
    id: row.id,
    weekStartLocalDate: row.weekStartLocalDate,
    timezone: row.timezone,
    rangeStartUtc: row.rangeStartUtc.toISOString(),
    rangeEndUtc: row.rangeEndUtc.toISOString(),
    status: row.status,
    generationStartedAt: toIso(row.generationStartedAt) ?? null,
    lastError: row.lastError ?? null,
    lastErrorAt: toIso(row.lastErrorAt) ?? null,
    claimedAt: toIso(row.claimedAt) ?? null,
    claimedBy: row.claimedBy ?? null,
    claimExpiresAt: toIso(row.claimExpiresAt) ?? null,
    attempts: row.attempts ?? 0,
    nextAttemptAt: toIso(row.nextAttemptAt) ?? null,
    emailedAt: toIso(row.emailedAt) ?? null,
    output: row.output ?? null,
    referencedThreadIds: row.referencedThreadIds ?? [],
    referencedEventIds: row.referencedEventIds ?? [],
    model: row.model ?? null,
    promptVersion: row.promptVersion ?? null,
    generatedAt: toIso(row.generatedAt) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
