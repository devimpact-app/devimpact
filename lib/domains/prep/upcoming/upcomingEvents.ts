import 'server-only';

import { and, asc, eq, gte, isNull, lt, ne, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { maybeRefreshUpcomingEvents } from './refresh';
import { attachPrepLinks } from './prepLinks';
import { formatCalendarEventResponse } from './formatResponse';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const DEFAULT_LIMIT = 10;

async function queryUpcomingEvents({
  tenantId,
  windowStart,
  windowEnd,
  includeAllDay,
  limit,
  isNextPrep,
}: {
  tenantId: string;
  windowStart?: Date;
  windowEnd: Date;
  includeAllDay?: boolean;
  limit: number;
  isNextPrep?: boolean;
}) {
  let where = and(
    eq(calendarEvents.tenantId, tenantId),
    isNull(calendarEvents.deletedAt),
    ne(calendarEvents.status, 'cancelled'),
    ne(calendarEvents.selfResponseStatus, 'declined'),
    includeAllDay ? undefined : eq(calendarEvents.isAllDay, false),
    or(
      eq(calendarEvents.category, 'oneOnOne'),
      and(
        eq(calendarEvents.category, 'team'),
        eq(calendarEvents.categorySubtype, 'standup')
      )
    )
  );

  if (isNextPrep) {
    where = and(where, gte(calendarEvents.startAt, windowEnd));
  } else {
    where = and(
      where,
      and(
        gte(calendarEvents.endAt, windowStart!),
        lt(calendarEvents.startAt, windowEnd)
      )
    );
  }

  const rows = await db
    .select()
    .from(calendarEvents)
    .where(where)
    .orderBy(asc(calendarEvents.startAt))
    .limit(limit);

  let items: UpcomingCalendarEvent[] = rows.map((r) =>
    formatCalendarEventResponse(r as any)
  );
  return items;
}

export async function getUpcomingCalendarEvents(params: {
  tenantId: string;
  timezone: string;
  now?: Date;
  limit?: number;
  includeAllDay?: boolean; // default true
}) {
  const {
    tenantId,
    timezone,
    now = new Date(),
    limit = DEFAULT_LIMIT,
    includeAllDay = true,
  } = params;

  // We want to keep upcoming events very fresh
  const refresh = await maybeRefreshUpcomingEvents({
    tenantId,
    now,
    lookaheadDays: 1,
  });

  const windowStart = now;
  const zonedNow = toZonedTime(now, timezone);
  const zonedEndOfDay = new Date(zonedNow);
  zonedEndOfDay.setHours(24, 0, 0, 0);
  const windowEnd = fromZonedTime(zonedEndOfDay, timezone);

  const todayItems = await queryUpcomingEvents({
    tenantId,
    windowStart,
    windowEnd,
    includeAllDay,
    limit,
  });

  let nextPrepSupported: UpcomingCalendarEvent | undefined = undefined;
  if (todayItems.length === 0) {
    const [nextItem] = await queryUpcomingEvents({
      tenantId,
      windowEnd,
      includeAllDay,
      limit: 1,
      isNextPrep: true,
    });
    if (nextItem) {
      nextPrepSupported = nextItem;
    }
  }

  return {
    nowISO: now.toISOString(),
    items: await attachPrepLinks({
      tenantId,
      events: todayItems,
    }),
    nextPrepSupported,
    refreshed: refresh.didRefresh,
  };
}
