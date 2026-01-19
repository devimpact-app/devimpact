import {
  WorkRhythm,
  WorkRhythmBucket,
  WorkRhythmSchema,
} from '@/types/api/work-rhythm';
import {
  formatRangeServer,
  getWeekBoundsFromOffsetServer,
} from '@/lib/utils/server-date';
import {
  applyMeetingOverlay,
  bucketEventsByDayAndBand,
  countWeekdayOccurrences,
} from './bucket';
// import { findBestFocusWindows } from './deep-work';
import { buildWorkRhythmDescription } from './description';
import { isCalendarConnected } from '@/lib/integrations/gcal/client';
import { CalendarEvent } from '@/lib/db/schema/gcal';
import { buildTimeSlices } from './timeSlices';
import { computeBestFocusWindows } from './bestFocusWindows';
import { findDeepWorkBlocks } from './deep-work';
import { differenceInCalendarDays } from 'date-fns';
import { findProtectWindows } from './protect-windows';
import { getCalendarEventsForRange } from '../../timeline/db/getCalendarEventsForRange';
import { getActivityEventsForRange } from '../../timeline/service/getActivityEventsForRange';

export type BuildWorkRhythmArgs = {
  userId: string;
  timezone: string;
  startOverride?: Date;
  endOverride?: Date;
};

function computeEveningSharePercent(buckets: WorkRhythmBucket[]): number {
  if (!buckets.length) return 0;

  let totalEvents = 0;
  let eveningEvents = 0;

  for (const b of buckets) {
    totalEvents += b.eventCount;
    if (b.band === 'eve') {
      eveningEvents += b.eventCount;
    }
  }

  if (totalEvents === 0) return 0;

  const raw = (eveningEvents / totalEvents) * 100;
  return Math.round(raw);
}

/**
 * Main orchestrator for Work Rhythm analysis.
 * Produces the heatmap buckets + derived weekly pattern insights.
 */
export async function buildWorkRhythm({
  userId,
  timezone,
  startOverride,
  endOverride,
}: BuildWorkRhythmArgs): Promise<WorkRhythm> {
  let start: Date;
  let end: Date;
  if (startOverride && endOverride) {
    start = startOverride;
    end = endOverride;
  } else {
    const bounds = getWeekBoundsFromOffsetServer(0, 4, timezone);
    start = bounds.start;
    end = bounds.end;
  }
  const days = Math.max(1, differenceInCalendarDays(start, end));
  const weeks = Math.max(1, days / 7);

  const range: WorkRhythm['range'] = {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: formatRangeServer(start, end, timezone),
  };

  const events = await getActivityEventsForRange({
    tenantId: userId,
    start,
    end,
  });

  const calendarConnected = await isCalendarConnected(userId);
  let calendarEvents: CalendarEvent[] = [];
  if (calendarConnected) {
    calendarEvents = await getCalendarEventsForRange({
      tenantId: userId,
      start,
      end,
    });
  }

  const bucketResp = bucketEventsByDayAndBand({
    events,
    timezone,
  });
  const maxBucketCount = bucketResp.maxBucketCount;
  const weekdayOccurences = countWeekdayOccurrences({
    startUtc: start,
    endUtc: end,
    timezone,
  });
  const buckets = applyMeetingOverlay({
    buckets: bucketResp.buckets,
    meetingEvents: calendarEvents,
    timezone,
    weekdayOccurences,
  });

  const timeSlices = buildTimeSlices({
    startUtc: start,
    endUtc: end,
    meetingEvents: calendarEvents,
    workEvents: events,
    sliceMinutes: 15,
    includePersonalMeetings: false,
  });

  const bestFocusWindows = computeBestFocusWindows({
    buckets,
    maxWindows: 3,
  });

  let avgDeepWorkBlocksPerWeek = 0;
  if (calendarConnected) {
    const deepWorkBlocks = findDeepWorkBlocks({
      slices: timeSlices,
      timezone,
      limit: 3,
    });
    avgDeepWorkBlocksPerWeek = deepWorkBlocks.length / weeks;
  }

  const eveningSharePercent = computeEveningSharePercent(buckets);

  const protectWindows = findProtectWindows({
    slices: timeSlices,
    timezone,
    limit: 3,
  });

  const summary = {
    description: buildWorkRhythmDescription({
      bestFocusWindows,
      avgDeepWorkBlocksPerWeek,
      eveningSharePercent,
    }),
    bestFocusWindows,
    avgDeepWorkBlocksPerWeek,
    eveningSharePercent,
    protectWindows,
  };

  const analysis: WorkRhythm = {
    version: 1,
    range,
    buckets,
    maxBucketCount,
    summary,
    calendar: {
      connected: calendarConnected,
    },
  };

  return WorkRhythmSchema.parse(analysis);
}
