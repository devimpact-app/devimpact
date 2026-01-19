import { db } from '@/lib/db/client';
import { CalendarEvent, calendarEvents } from '@/lib/db/schema/gcal';
import { and, asc, desc, eq, gte, isNull, lt, ne } from 'drizzle-orm';
import { formatCalendarEventResponse } from '../../upcoming/formatResponse';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const DEFAULT_LOOKAHEAD_DAYS = 7;
const DEFAULT_RECENT_DAYS_FALLBACK = 3;

const LIMIT_RECENT = 12;
const LIMIT_UPCOMING = 12;

export type OOOEventForLLM = {
  id: string;
  startAtISO: string;
  endAtISO: string;
  isAllDay: boolean;
  title: string | null;
  eventType: string | null;
};

export interface OOORecapForLLM {
  recent: {
    count: number;
    items: OOOEventForLLM[];
  };
  upcoming: {
    count: number;
    items: OOOEventForLLM[];
  };
}

export type FetchOOOContextResponse = {
  llm: OOORecapForLLM;
  full: {
    recent: UpcomingCalendarEvent[];
    upcoming: UpcomingCalendarEvent[];
  };
};

function toLLMItem(r: CalendarEvent): OOOEventForLLM {
  return {
    id: r.id,
    startAtISO: r.startAt.toISOString(),
    endAtISO: r.endAt.toISOString(),
    isAllDay: !!r.isAllDay,
    title: r.title ?? null,
    eventType: r.eventType ?? null,
  };
}

function toLocalDayBoundsUTC(dateUTC: Date, timezone: string) {
  const zoned = toZonedTime(dateUTC, timezone);
  const startZ = startOfDay(zoned);
  const endZ = endOfDay(zoned);
  return {
    startUTC: fromZonedTime(startZ, timezone),
    endUTC: fromZonedTime(endZ, timezone),
  };
}

export async function fetchOOOContext(params: {
  tenantId: string;
  timezone: string;
  now?: Date;
}): Promise<FetchOOOContextResponse> {
  const { tenantId, timezone, now = new Date() } = params;

  const recentWindowStart = subDays(now, DEFAULT_RECENT_DAYS_FALLBACK);
  const recentWindowEnd = now;

  const { endUTC: endOfLookaheadUTC } = toLocalDayBoundsUTC(
    addDays(now, DEFAULT_LOOKAHEAD_DAYS),
    timezone
  );

  const base = and(
    eq(calendarEvents.tenantId, tenantId),
    isNull(calendarEvents.deletedAt),
    eq(calendarEvents.category, 'ooo'),
    ne(calendarEvents.status, 'cancelled'),
    ne(calendarEvents.selfResponseStatus, 'declined')
  );

  const recentRows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        base,
        lt(calendarEvents.startAt, recentWindowEnd),
        gte(calendarEvents.endAt, recentWindowStart)
      )
    )
    .orderBy(desc(calendarEvents.startAt))
    .limit(LIMIT_RECENT);

  const upcomingRows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        base,
        gte(calendarEvents.startAt, now),
        lt(calendarEvents.startAt, endOfLookaheadUTC)
      )
    )
    .orderBy(asc(calendarEvents.startAt))
    .limit(LIMIT_UPCOMING);

  const recentFull = recentRows.map((r) => formatCalendarEventResponse(r));
  const upcomingFull = upcomingRows.map((r) => formatCalendarEventResponse(r));

  return {
    llm: {
      recent: {
        count: recentRows.length,
        items: recentRows.map(toLLMItem),
      },
      upcoming: {
        count: upcomingRows.length,
        items: upcomingRows.map(toLLMItem),
      },
    },
    full: {
      recent: recentFull,
      upcoming: upcomingFull,
    },
  };
}
