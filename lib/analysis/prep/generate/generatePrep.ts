import { PrepItem, PrepPayload } from '@/lib/db/schema';
import { PrepMeetingType } from '@/types/api/prep';
import { getWindowsFromPrepItem } from './windows';
import { fetchInsightsForWindow } from '../one-on-ones/insights';
import { fetchMetricsForWindows } from '../one-on-ones/metrics';
import { getActivityForOneOnOneRange } from '../one-on-ones/activity';
import { buildWorkRhythm } from '../../work-rhythm/buildWorkRhythm';
import { runFetchPlan } from './fetchers/runFetchPlan';

type MeetingContext = {
  meetingType: PrepMeetingType;
  meetingStartAtISO: string;
  meetingEndAtISO: string | null;
  title: string | null;
  timezone: string;
  primaryWindowStartISO: string;
  primaryWindowEndISO: string;
  secondaryWindowStartISO: string;
  secondaryWindowEndISO: string;
};

function buildMeetingContext(prepItem: PrepItem): MeetingContext {
  const endISO =
    prepItem.endAt?.toISOString() ??
    (prepItem.durationMinutes
      ? new Date(
          prepItem.startAt.getTime() + prepItem.durationMinutes * 60_000
        ).toISOString()
      : null);

  return {
    meetingType: prepItem.meetingType as PrepMeetingType,
    meetingStartAtISO: prepItem.startAt.toISOString(),
    meetingEndAtISO: endISO,
    title: prepItem.titleRedacted ?? null,
    timezone: prepItem.timezone,

    primaryWindowStartISO: prepItem.primaryWindowStartAt.toISOString(),
    primaryWindowEndISO: prepItem.primaryWindowEndAt.toISOString(),
    secondaryWindowStartISO: prepItem.secondaryWindowStartAt.toISOString(),
    secondaryWindowEndISO: prepItem.secondaryWindowEndAt.toISOString(),
  };
}

export async function generatePrepFromRequest({
  tenantId,
  prepItem,
}: {
  tenantId: string;
  prepItem: PrepItem;
}): Promise<PrepPayload> {
  const timezone = prepItem.timezone;
  const windows = getWindowsFromPrepItem(prepItem);
  const meeting = buildMeetingContext(prepItem);

  const primaryStart = windows.primary.startAt;
  const primaryEnd = windows.primary.endAt;
  const secondaryStart = windows.secondary.startAt;
  const secondaryEnd = windows.secondary.endAt;

  const fetched = await runFetchPlan({
    meetingType: prepItem.meetingType as PrepMeetingType,
    ctx: {
      tenantId,
      timezone,
      primary: { start: primaryStart, end: primaryEnd },
      secondary: { start: secondaryStart, end: secondaryEnd },
    },
  });

  let llmOutput: LLMOutput;

  switch (prepItem.meetingType as PrepMeetingType) {
    case 'standup': {
      const ctx: StandupLLMContext = {
        meeting,
        activity: activityPrimary.llm,
        workRhythm: workRhythm.llm,
        meetings: meetingsPrimary.llm,
      };
      llmOutput = await generateStandupPrepLLM(ctx);
      break;
    }

    case 'oneOnOne': {
      const ctx: OneOnOneLLMContext = {
        meeting,
        metrics: metrics.llm,
        insights: insights.llm,
        activity: activityPrimary.llm,
        workRhythm: workRhythm.llm,
        meetings: meetingsPrimary.llm,
      };
      llmOutput = await generateOneOnOnePrepLLM(ctx);
      break;
    }

    case 'planning': {
      const ctx: PlanningLLMContext = {
        meeting,
        metrics: metrics.llm,
        insights: insights.llm,
        activity: activityPrimary.llm,
        workRhythm: workRhythm.llm,
        meetings: meetingsPrimary.llm,
      };
      llmOutput = await generatePlanningPrepLLM(ctx);
      break;
    }

    case 'retro': {
      const ctx: RetroLLMContext = {
        meeting,
        metrics: metrics.llm,
        insights: insights.llm,
        activity: activityPrimary.llm,
        workRhythm: workRhythm.llm,
        meetings: meetingsPrimary.llm,
      };
      llmOutput = await generateRetroPrepLLM(ctx);
      break;
    }

    default: {
      // If you later add types, fail loudly so you don’t silently ship junk.
      const exhaustive: never = prepItem.meetingType as never;
      throw new Error(`Unsupported meetingType: ${String(exhaustive)}`);
    }
  }

  const references = extractUsedReferences({
    meetingType: prepItem.meetingType as PrepMeetingType,
    llmOutput,
    full: {
      insights: insights.full,
      metrics: metrics.full,
      activity: activityPrimary.full,
      workRhythm: workRhythm.full,
      meetings: meetingsPrimary.full,
    },
  });

  const payload = {
    output: llmOutput.sections ?? {},
    talkingPoints: llmOutput.talkingPoints ?? [],
    references,
  } as unknown as PrepPayload;

  return payload;
}
