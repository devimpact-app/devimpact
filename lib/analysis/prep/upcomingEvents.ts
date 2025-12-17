import 'server-only';

import { and, asc, eq, gte, isNull, lt, ne } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { UpcomingCalendarEvent } from '@/types/api/prep';

const DEFAULT_LOOKAHEAD_DAYS = 7;
const DEFAULT_LIMIT = 10;

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function minutesUntil(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 60000);
}

export async function getUpcomingCalendarEvents(params: {
  tenantId: string;
  now?: Date;
  lookaheadDays?: number;
  limit?: number;
  includeAllDay?: boolean; // default true
}) {
  const {
    tenantId,
    now = new Date(),
    lookaheadDays = DEFAULT_LOOKAHEAD_DAYS,
    limit = DEFAULT_LIMIT,
    includeAllDay = true,
  } = params;

  const windowStart = now;
  const windowEnd = addDays(now, lookaheadDays);

  // Core filters:
  // - not deleted
  // - upcoming start time
  // - not cancelled
  // - not declined by self (optional, but usually desired)
  // - optionally exclude all-day events (often noisy for "prep")
  const where = and(
    eq(calendarEvents.tenantId, tenantId),
    isNull(calendarEvents.deletedAt),
    gte(calendarEvents.startAt, windowStart),
    lt(calendarEvents.startAt, windowEnd),
    ne(calendarEvents.status, 'cancelled'),
    ne(calendarEvents.selfResponseStatus, 'declined'),
    includeAllDay ? undefined : eq(calendarEvents.isAllDay, false)
  );

  const rows = await db
    .select({
      id: calendarEvents.id,
      calendarId: calendarEvents.calendarId,
      googleEventId: calendarEvents.googleEventId,
      recurringEventId: calendarEvents.recurringEventId,
      startAt: calendarEvents.startAt,
      endAt: calendarEvents.endAt,
      durationMinutes: calendarEvents.durationMinutes,
      isAllDay: calendarEvents.isAllDay,
      title: calendarEvents.titleRedacted,
      status: calendarEvents.status,
      selfResponseStatus: calendarEvents.selfResponseStatus,
      isOrganizerSelf: calendarEvents.isOrganizerSelf,
      attendeesTotal: calendarEvents.attendeesTotal,
      attendeesAccepted: calendarEvents.attendeesAccepted,
      attendeesDeclined: calendarEvents.attendeesDeclined,
      attendeesNeedsAction: calendarEvents.attendeesNeedsAction,
      category: calendarEvents.category,
      categorySubtype: calendarEvents.categorySubtype,
      categoryConfidence: calendarEvents.categoryConfidence,
      categorySource: calendarEvents.categorySource,
    })
    .from(calendarEvents)
    .where(where)
    .orderBy(asc(calendarEvents.startAt))
    .limit(limit);

  const items: UpcomingCalendarEvent[] = rows
    .filter((r) => {
      const cat = (r.category ?? 'other') as string;
      const isPrepRelevant = !(
        cat === 'personal' ||
        cat === 'focus' ||
        cat === 'other'
      );
      if (!isPrepRelevant) return false;
      const isOOOContext = cat === 'ooo' && r.isAllDay === true;
      if (isOOOContext) {
        // Only care about OOO if coming up soon
        const mins = minutesUntil(now, r.startAt);
        const within36h = mins <= 36 * 60;
        if (!within36h) return false;
      }
      return true;
    })
    .map((r) => ({
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
      startsInMinutes: minutesUntil(now, r.startAt),
    }));

  return {
    nowISO: now.toISOString(),
    lookaheadDays,
    items,
  };
}
