import { WEEKLY_SUMMARY_LIMITS, WeeklySummaryLimits } from '../limits';
import { WeeklySummaryLLMInput, WeeklySummaryThreadInput } from '../llm/types';
import { getActiveThreadsForWeek } from './getActiveThreadsForWeek';
import { getThreadSummaryBulletsForThreads } from './getThreadBullets';
import {
  getWeeklySummaryEvents,
  UNTHREADED_KEY,
} from './getWeeklySummaryEvents';

export async function buildWeeklySummaryInput({
  tenantId,
  weekStartLocalDate,
  weekStart,
  weekEnd,
  timezone,
  limits,
}: {
  tenantId: string;
  weekStartLocalDate: string;
  weekStart: Date;
  weekEnd: Date;
  timezone: string;
  limits?: WeeklySummaryLimits;
}): Promise<{
  llmInput: WeeklySummaryLLMInput;
  allThreadIds: string[];
  allEventIds: string[];
}> {
  const resolvedLimits = {
    ...WEEKLY_SUMMARY_LIMITS,
    ...limits,
  };

  const activeThreads = await getActiveThreadsForWeek({
    tenantId,
    weekStartUtc: weekStart,
    weekEndUtc: weekEnd,
    limit: resolvedLimits.maxThreads,
  });
  const activeThreadIds = activeThreads.map((t) => t.id);
  const threadBulletsMap = await getThreadSummaryBulletsForThreads({
    tenantId,
    threadIds: activeThreadIds,
    perThreadLimit: resolvedLimits.maxBullets,
  });
  const { threadEventMap, allEventIds, countsByKind } =
    await getWeeklySummaryEvents({
      tenantId,
      weekStartUtc: weekStart,
      weekEndUtc: weekEnd,
      limit: resolvedLimits.maxEventsPerThread,
    });

  const threadInputs: WeeklySummaryThreadInput[] = activeThreads.map(
    (thread) => {
      return {
        id: thread.id,
        categoryKey: thread.categoryKey,
        title: thread.title,
        headline: thread.summaryHeadline,
        bullets: (threadBulletsMap[thread.id] ?? []).map((bullet) => ({
          id: bullet.id,
          sortIndex: bullet.sortIndex,
          text: bullet.text,
          editable: bullet.editable,
          referencedEventIds: bullet.referencedEventIds,
        })),
        weekEvents: threadEventMap[thread.id] ?? [],
        weekStats: {
          eventCount: thread.weekEventCount,
          countsByKind: {
            pr: thread.eventCountPr,
            review: thread.eventCountReview,
            meeting: thread.eventCountMeeting,
            ooo: thread.eventCountOoo,
          },
        },
      };
    }
  );

  // TODO: work rhythm most productive window??

  const input: WeeklySummaryLLMInput = {
    week: {
      timezone,
      weekStartLocalDate,
      rangeStartUtc: weekStart.toISOString(),
      rangeEndUtc: weekEnd.toISOString(),
    },
    atAGlance: {
      activeThreads: activeThreads.length,
      totalEvents: allEventIds.length,
      countsByKind,
    },
    threads: threadInputs,
    notableUnthreadedEvents: threadEventMap[UNTHREADED_KEY] ?? [],
  };
  return {
    llmInput: input,
    allThreadIds: activeThreadIds,
    allEventIds,
  };
}
