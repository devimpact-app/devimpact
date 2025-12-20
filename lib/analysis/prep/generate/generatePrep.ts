import { PrepItem, PrepPayload } from '@/lib/db/schema';
import { PrepMeetingType } from '@/types/api/prep';
import { getWindowsFromPrepItem } from './windows';
import { runFetchPlan } from './fetchers/runFetchPlan';
import { buildMeetingContext } from './context';
import { generateOneOnOneTalkingPoints } from './llm/oneOnOne/generate';
import { OneOnOneLLMContext } from './llm/oneOnOne/types';
import { PrepLLMOutput } from './types';
import { extractUsedReferences } from './references';

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

  let llmOutput: PrepLLMOutput;

  if (
    !fetched.activityPrimary ||
    !fetched.workRhythmSecondary ||
    !fetched.meetingsPrimary
  ) {
    throw new Error('There was an issue fetching data for meeting prep');
  }
  switch (prepItem.meetingType as PrepMeetingType) {
    // case 'standup': {
    //   const ctx: StandupLLMContext = {
    //     meeting,
    //     workRhythm: fetched.workRhythmSecondary.llm,
    //     // TODO: add more
    //   } as any;
    //   llmOutput = await generateStandup(ctx);
    //   break;
    // }

    case 'oneOnOne': {
      if (!fetched.metricsPrimaryAndSecondary || !fetched.insightsSecondary) {
        throw new Error('There was an issue fetching data for meeting prep');
      }
      const ctx: OneOnOneLLMContext = {
        meeting,
        metrics: fetched.metricsPrimaryAndSecondary.llm,
        insights: fetched.insightsSecondary.llm,
        activity: fetched.activityPrimary.llm,
        workRhythm: fetched.workRhythmSecondary.llm,
        // meetings: fetched.meetingsPrimary.llm,
      } as any;
      llmOutput = await generateOneOnOneTalkingPoints(ctx);
      break;
    }

    default: {
      // If you later add types, fail loudly so you don’t silently ship junk.
      const exhaustive: never = prepItem.meetingType as never;
      throw new Error(`Unsupported meetingType: ${String(exhaustive)}`);
    }
  }

  const talkingPoints = llmOutput.talkingPoints ?? [];
  const references = extractUsedReferences(talkingPoints, {
    prs: fetched.activityPrimary?.full?.fullPrs ?? [],
    reviews: fetched.activityPrimary?.full?.fullReviews ?? [],
    insights: fetched.insightsSecondary?.full ?? [],
    metrics: fetched.metricsPrimaryAndSecondary?.full ?? [],
    primaryWindowStartISO: primaryStart.toISOString(),
    primaryWindowEndISO: primaryEnd.toISOString(),
  });

  const payload = {
    talkingPoints: llmOutput.talkingPoints ?? [],
    ...references,
  } as PrepPayload;

  return payload;
}
