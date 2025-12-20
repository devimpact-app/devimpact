import 'server-only';

import { and, asc, eq, gte, isNull, lt, ne } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { maybeRefreshUpcomingEvents } from './refresh';
import { addDays } from 'date-fns';
import { attachPrepLinks } from './prepLinks';

const DEFAULT_LOOKAHEAD_DAYS = 7;
const DEFAULT_LIMIT = 10;

function minutesUntil(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 60000);
}

function applyPrepDisplayRules(items: UpcomingCalendarEvent[]) {
  // Only show one standup at a time
  const singleInstanceSubtypes = new Set(['standup']);

  const keep: UpcomingCalendarEvent[] = [];
  const seen = new Set<string>();

  for (const e of items) {
    const cat = e.category;
    const subtype = e.categorySubtype;

    if (cat === 'oneOnOne') {
      keep.push(e);
      continue;
    }

    // Only dedupe selected team subtypes
    if (
      cat === 'team' &&
      subtype &&
      singleInstanceSubtypes.has(subtype) &&
      e.recurringEventId
    ) {
      const seriesKey = e.recurringEventId;

      if (seen.has(seriesKey)) continue;
      seen.add(seriesKey);

      keep.push(e);
      continue;
    }

    keep.push(e);
  }

  return keep;
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

  // We want to keep upcoming events very fresh
  const refresh = await maybeRefreshUpcomingEvents({
    tenantId,
    now,
    lookaheadDays,
  });

  const windowStart = now;
  const windowEnd = addDays(now, lookaheadDays);
  const where = and(
    eq(calendarEvents.tenantId, tenantId),
    isNull(calendarEvents.deletedAt),
    gte(calendarEvents.endAt, windowStart),
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
    .orderBy(asc(calendarEvents.startAt));

  let items: UpcomingCalendarEvent[] = rows
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

  items = applyPrepDisplayRules(items);
  items = items.slice(0, limit);

  return {
    nowISO: now.toISOString(),
    lookaheadDays,
    items: await attachPrepLinks({
      tenantId,
      events: items,
    }),
    refreshed: refresh.didRefresh,
  };
}
