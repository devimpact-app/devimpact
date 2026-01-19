import { WeeklyCalendarSummary } from '@/types/api/weekly-activity';
import { isCalendarConnected } from '@/lib/integrations/gcal/client';
import { minutesBetween } from '@/lib/utils/date';
import { getCalendarEventsForRange } from '../../timeline/db/getCalendarEventsForRange';
import { buildTimeSlices } from '../../work-rhythm/service/timeSlices';
import { findDeepWorkBlocks } from '../../work-rhythm/service/deep-work';

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
      subcategoryMap: Record<
        string,
        { key: string; count: number; minutes: number }
      >;
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
      const catKey = ev.category;

      const cat = (categoryMap[catKey] ??= {
        key: catKey,
        count: 0,
        minutes: 0,
        subcategoryMap: {},
      });

      const mins = minutesBetween(clampedStart, clampedEnd) ?? 0;

      cat.count += 1;
      cat.minutes += mins;

      if (ev.categorySubtype) {
        const subKeyRaw = ev.categorySubtype.trim();
        const subKey = subKeyRaw || 'other';

        const sub = (cat.subcategoryMap[subKey] ??= {
          key: subKey,
          count: 0,
          minutes: 0,
        });

        sub.count += 1;
        sub.minutes += mins;
      }
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
  const categories = Object.values(categoryMap)
    .map((c) => {
      const subcategories = Object.values(c.subcategoryMap).sort(
        (a, b) => b.minutes - a.minutes
      );

      const topSubcategories = subcategories.slice(0, 5);

      return {
        key: c.key,
        count: c.count,
        minutes: c.minutes,
        subcategories: topSubcategories.map((sc) => sc.key),
        subcategoryCountTotal: subcategories.length,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return {
    meetingMinutes,
    meetingCount,
    categories: categories as any,
    deepWorkBlocksCount: deepWorkBlocks.length,
  };
}
