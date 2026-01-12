import { WeeklySummary } from '@/lib/db/schema/weekly-summary';
import {
  ClaimWeeklySummaryResult,
  claimWeeklySummaryRow,
  computeBackoff,
} from './claim';
import {
  getMostRecentlyCompletedWeekWindowIso,
  getWeekWindowIso,
} from './windows';
import { buildWeeklySummaryInput } from './queries/buildWeeklySummaryInput';
import { generateWeeklySummary } from './llm/generate';
import { validateWeeklySummaryOutput } from './llm/validate';
import {
  markWeeklySummaryFailed,
  markWeeklySummaryReadyFromLLM,
  markWeeklySummarySkipped,
} from './persist/updateWeeklySummary';
import { AiConfig } from '@/lib/integrations/openai/config';

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
      processed: boolean;
      generationMs?: number;
      error?: string;
    }
  | {
      action: Exclude<ClaimWeeklySummaryResult['action'], 'proceed'>;
      claim: Exclude<ClaimWeeklySummaryResult, { action: 'proceed' }>;
      finalRow: WeeklySummary;
      processed: false;
    };

function toErrorString(err: unknown) {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

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

  try {
    const { llmInput, allThreadIds, allEventIds } =
      await buildWeeklySummaryInput({
        ...commonParams,
      });
    console.log('llmInput', llmInput);

    const hasAnySignal =
      (llmInput.threads?.length ?? 0) > 0 ||
      (llmInput.notableUnthreadedEvents?.length ?? 0) > 0;

    if (!hasAnySignal) {
      // Skip if no data
      const skippedRow = await markWeeklySummarySkipped({
        tenantId: input.tenantId,
        rowId: claimRow.id,
        now: new Date(),
      });

      return {
        action: 'proceed',
        claim,
        claimedRow: claimRow,
        finalRow: skippedRow,
        processed: false,
      };
    }

    const rawGenerateResponse = await generateWeeklySummary(llmInput);
    console.log('raw resp', rawGenerateResponse);
    const v = validateWeeklySummaryOutput(rawGenerateResponse, {
      allowedEventIds: allEventIds,
      allowedThreadIds: allThreadIds,
    });
    if (!v.ok) {
      throw new Error(
        `Error during validation of weekly summary llm response ${v.error}`
      );
    }

    const output = v.value;
    const updatedRow = await markWeeklySummaryReadyFromLLM({
      tenantId: input.tenantId,
      rowId: claimRow.id,
      output,
      llm: {
        model: AiConfig.models.summarize,
        promptVersion: '1',
      },
    });

    return {
      action,
      claim,
      claimedRow: claimRow,
      finalRow: updatedRow,
      processed: true,
    };
  } catch (err) {
    const msg = toErrorString(err);

    const backoffMs = computeBackoff(claimRow.attempts ?? 0);
    const backoffUntil = new Date(Date.now() + backoffMs);

    const failedRow = await markWeeklySummaryFailed({
      tenantId: input.tenantId,
      rowId: claimRow.id,
      error: msg,
      now: new Date(),
      backoffUntil,
    });

    return {
      action: 'proceed',
      claim,
      claimedRow: claimRow,
      finalRow: failedRow,
      processed: false,
      error: msg,
    };
  }
}
