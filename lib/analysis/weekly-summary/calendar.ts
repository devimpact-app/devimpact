import { WeeklyCalendarSummary } from '@/types/api/weekly-summary';
import { isCalendarConnected } from '@/lib/integrations/gcal/client';
import { getCalendarEventsForRange } from '../activity/getCalendarEventsForRange';
import { minutesBetween } from '@/lib/utils/date';

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
  }

  return { meetingMinutes, meetingCount };
}
