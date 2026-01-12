import { PrepItem, PrepPayload } from '@/lib/db/schema';
import { PrepMeetingType } from '@/types/api/prep';
import { getWindowsFromPrepItem } from './windows';
import { runFetchPlan } from './fetchers/runFetchPlan';
import { buildMeetingContext } from './context';
import { generateOneOnOneTalkingPoints } from './llm/oneOnOne/generate';
import { OneOnOneLLMContext } from './llm/oneOnOne/types';
import { PrepLLMOutput } from './types';
import { extractUsedReferences } from './references';
import { StandupLLMContext } from './llm/standup/types';
import { getShippedItemFromPr } from '../../weekly-activity/highlightedPrs';
import { getHighlightedReviewFromReview } from '../../weekly-activity/highlightedReviews';
import { generateStandup } from './llm/standup/generate';

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

  const {
    activityPrimary,
    workRhythmSecondary,
    metricsPrimaryAndSecondary,
    insightsSecondary,
    meetingsPrimary,
    upcomingMeetings,
    ooo,
    inFlight,
  } = fetched;
  if (!activityPrimary || !workRhythmSecondary || !meetingsPrimary) {
    throw new Error('There was an issue fetching data for meeting prep');
  }
  switch (prepItem.meetingType as PrepMeetingType) {
    case 'standup': {
      if (!upcomingMeetings || !ooo || !inFlight) {
        throw new Error('There was an issue fetching data for meeting prep');
      }
      const ctx: StandupLLMContext = {
        meeting,
        workRhythm: workRhythmSecondary.llm.summary,
        work: {
          recentShipped: activityPrimary.full.fullPrs.map((pr) =>
            getShippedItemFromPr(
              pr,
              'other',
              activityPrimary.full.prSummariesById
            )
          ),
          recentReviews: activityPrimary.full.fullReviews.map((r) =>
            getHighlightedReviewFromReview({
              review: r.review,
              pr: r.pr!,
            })
          ),
          inFlightPrs: inFlight.llm.inFlightPrs,
          // TODO
          reviewQueue: [],
        },
        calendar: {
          recentMeetings: meetingsPrimary.llm,
          upcomingMeetings: upcomingMeetings.llm,
          upcomingOOO: ooo.llm,
        },
      };
      llmOutput = await generateStandup(ctx);
      break;
    }

    case 'oneOnOne': {
      if (!metricsPrimaryAndSecondary || !insightsSecondary || !inFlight) {
        throw new Error('There was an issue fetching data for meeting prep');
      }
      const ctx: OneOnOneLLMContext = {
        meeting,
        metrics: metricsPrimaryAndSecondary.llm,
        insights: insightsSecondary.llm,
        activity: activityPrimary.llm,
        workRhythm: workRhythmSecondary.llm.summary,
        meetings: meetingsPrimary.llm,
        inFlightPrs: inFlight.llm.inFlightPrs,
      };
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
  const calendarEvents = [
    ...(fetched.meetingsPrimary?.full.fullMeetings ?? []),
    ...(fetched.upcomingMeetings?.full.fullMeetings ?? []),
  ];
  const prs = [
    ...(fetched.activityPrimary?.full?.fullPrs ?? []),
    ...(fetched.inFlight?.full.fullPrs ?? []),
  ];
  const references = extractUsedReferences(talkingPoints, {
    prs,
    reviews: fetched.activityPrimary?.full?.fullReviews ?? [],
    insights: fetched.insightsSecondary?.full ?? [],
    metrics: fetched.metricsPrimaryAndSecondary?.full ?? [],
    calendarEvents,
    primaryWindowStartISO: primaryStart.toISOString(),
    primaryWindowEndISO: primaryEnd.toISOString(),
  });

  const payload = {
    talkingPoints: llmOutput.talkingPoints ?? [],
    ...references,
  } as PrepPayload;

  return payload;
}
