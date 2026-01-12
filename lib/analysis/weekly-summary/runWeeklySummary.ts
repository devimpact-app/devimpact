import { WeeklySummary } from '@/lib/db/schema/weekly-summary';
import { ClaimWeeklySummaryResult, claimWeeklySummaryRow } from './claim';
import {
  getMostRecentlyCompletedWeekWindowIso,
  getWeekWindowIso,
} from './windows';
import { WeeklySummaryLLMInput } from './llm/types';
import { buildWeeklySummaryInput } from './queries/buildWeeklySummaryInput';
import { generateWeeklySummary } from './llm/generate';

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

  const commonParams = {
    tenantId: input.tenantId,
    weekStartLocalDate,
    timezone: tz,
    weekStart,
    weekEnd,
  };
  const claim = await claimWeeklySummaryRow({
    ...commonParams,
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

  const llmInput = await buildWeeklySummaryInput({
    ...commonParams,
  });

  const rawGenerateResponse = await generateWeeklySummary(llmInput);
  // TODO: validate response

  // TODO: persist summary
}
