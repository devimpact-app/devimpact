import { CalendarEvent } from '@/lib/db/schema/gcal';
import { UpcomingCalendarEvent } from '@/types/api/prep';

export function minutesUntil(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 60000);
}

export function formatCalendarEventResponse(
  r: CalendarEvent,
  now: Date
): UpcomingCalendarEvent {
  return {
    id: r.id,
    calendarId: r.calendarId,
    googleEventId: r.googleEventId,
    recurringEventId: r.recurringEventId ?? null,
    startAtISO: r.startAt.toISOString(),
    endAtISO: r.endAt.toISOString(),
    durationMinutes: r.durationMinutes ?? null,
    isAllDay: r.isAllDay,
    title: r.title ?? null,
    status: r.status ?? null,
    selfResponseStatus: r.selfResponseStatus ?? null,
    isOrganizerSelf: !!r.isOrganizerSelf,
    attendeesTotal: r.attendeesTotal ?? 0,
    attendeesAccepted: r.attendeesAccepted ?? 0,
    attendeesDeclined: r.attendeesDeclined ?? 0,
    attendeesNeedsAction: r.attendeesNeedsAction ?? 0,
    category: (r.category as any) ?? 'other',
    categorySubtype: (r.categorySubtype as any) ?? null,
    categoryConfidence: r.categoryConfidence ?? null,
    categorySource: r.categorySource ?? null,
  };
}
