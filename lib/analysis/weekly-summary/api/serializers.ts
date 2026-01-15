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
    lastError: row.lastError ?? null,
    emailedAt: toIso(row.emailedAt) ?? null,
    output: row.output ?? null,
    referencedThreadIds: row.referencedThreadIds ?? [],
    referencedEventIds: row.referencedEventIds ?? [],
    generatedAt: toIso(row.generatedAt) ?? null,
  };
}
