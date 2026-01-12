import { WeeklySummary } from '@/lib/db/schema/weekly-summary';
import { ClaimWeeklySummaryResult, claimWeeklySummaryRow } from './claim';
import {
  getMostRecentlyCompletedWeekWindowIso,
  getWeekWindowIso,
} from './windows';

type RunWeeklySummaryInput = {
  tenantId: string;
  weekStartIso?: string; // 'YYYY-MM-DD' in tenant timezone
  timezone?: string;
  force?: boolean;
};

export type RunWeeklySummaryResult =
  | {
      action: 'proceed';
      claim: Extract<ClaimWeeklySummaryResult, { action: 'proceed' }>;
      claimedRow: WeeklySummary;
      finalRow: WeeklySummary;
      processed: true;
      generationMs?: number;
    }
  | {
      action: Exclude<ClaimWeeklySummaryResult['action'], 'proceed'>;
      claim: Exclude<ClaimWeeklySummaryResult, { action: 'proceed' }>;
      finalRow: WeeklySummary;
      processed: false;
    };

export async function runWeeklySummary(
  input: RunWeeklySummaryInput
): Promise<RunWeeklySummaryResult> {
  // TODO: Add TZ to DB during setup
  const tz = input.timezone ?? 'America/Los_Angeles';

  const now = new Date();
  const { weekStart, weekEnd, weekStartLocalDate } = input.weekStartIso
    ? getWeekWindowIso({
        dateIso: input.weekStartIso,
        timezone: tz,
      })
    : getMostRecentlyCompletedWeekWindowIso({
        timezone: tz,
        now,
      });

  const claim = await claimWeeklySummaryRow({
    tenantId: input.tenantId,
    weekStartLocalDate,
    timezone: tz,
    weekStart,
    weekEnd,
    now,
    force: input.force,
  });

  const { action, row: claimRow } = claim;
  if (action !== 'proceed') {
    return {
      action,
      claim,
      finalRow: claimRow,
      processed: false,
    };
  }

  // TODO
  // fetch threads/events in [weekStart, weekEnd)

  // Inputs for weekly summary
  // Threads active in week
  // - Include title, headline, bullets, events in week, if thread is new/continued
  // Unthreaded but potentially important events
  // - especially meetings fall into this
  // Weekly activity stats (lightweight)
  // - PRs opened/merged
  // - reviews completed
  // - meetings attended
  // Work rhythm
  // - Show only something simple like "most productive time of week"

  // llm -> validate -> persist
}
