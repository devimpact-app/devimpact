import { WeeklyCalendarSummary } from '@/types/api/weekly-activity';
import { isCalendarConnected } from '@/lib/integrations/gcal/client';
import { getCalendarEventsForRange } from '../timeline/getCalendarEventsForRange';
import { minutesBetween } from '@/lib/utils/date';
import { findDeepWorkBlocks } from '../work-rhythm/deep-work';
import { buildTimeSlices } from '../work-rhythm/timeSlices';

export async function getWeeklyMeetingTotals(params: {
  tenantId: string;
  start: Date;
  end: Date;
  timezone: string;
}): Promise<WeeklyCalendarSummary | undefined> {
  const isConnected = await isCalendarConnected(params.tenantId);
  if (!isConnected) return undefined;

  const events = await getCalendarEventsForRange(
    { tenantId: params.tenantId, start: params.start, end: params.end },
    { includePersonal: false }
  );

  if (!events?.length) {
    return { meetingMinutes: 0, meetingCount: 0 };
  }

  let meetingMinutes = 0;
  let meetingCount = 0;

  const categoryMap: Record<
    string,
    {
      key: string;
      count: number;
      minutes: number;
    }
  > = {};
  for (const ev of events) {
    if (ev.deletedAt) continue;
    if (ev.isAllDay) continue;
    if (ev.selfResponseStatus === 'declined') continue;

    const s = new Date(ev.startAt);
    const e = new Date(ev.endAt);
    if (!(s < e)) continue;

    const clampedStart = s < params.start ? params.start : s;
    const clampedEnd = e > params.end ? params.end : e;
    if (!(clampedStart < clampedEnd)) continue;

    meetingMinutes += minutesBetween(clampedStart, clampedEnd) ?? 0;
    meetingCount += 1;

    // Category
    if (ev.category) {
      const categoryMapItem = categoryMap[ev.category] || {
        key: ev.category,
        count: 0,
        minutes: 0,
      };
      categoryMapItem.count += 1;
      categoryMapItem.minutes += minutesBetween(clampedStart, clampedEnd) ?? 0;
      categoryMap[ev.category] = categoryMapItem;
    }
  }

  const slices = buildTimeSlices({
    startUtc: params.start,
    endUtc: params.end,
    sliceMinutes: 15,
    meetingEvents: events,
    // Don't need to care about work events for deep work blocks
    workEvents: [],
    includePersonalMeetings: false,
  });
  const deepWorkBlocks = findDeepWorkBlocks({
    slices,
    timezone: params.timezone,
    limit: 3,
  });
  const categories = Object.values(categoryMap).sort(
    (a, b) => b.minutes - a.minutes
  );

  return {
    meetingMinutes,
    meetingCount,
    categories: categories as any,
    deepWorkBlocksCount: deepWorkBlocks.length,
  };
}
