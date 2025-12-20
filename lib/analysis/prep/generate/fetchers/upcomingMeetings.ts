import { TeamMeetingSubtype } from '@/lib/integrations/gcal/sync/categorizer';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { CalendarEventForLLM, MeetingRecapForLLM } from '../types';
import { CalendarEventCategory } from '@/types/api/weekly-summary';
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  notInArray,
} from 'drizzle-orm';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { addDays, differenceInMinutes, endOfDay } from 'date-fns';
import { endOfDayServer } from '@/lib/utils/server-date';
import { db } from '@/lib/db/client';
import { minutesBetween } from '@/lib/utils/date';
import { formatCalendarEventResponse } from '../../upcoming/formatResponse';

const LIMIT_TODAY = 8;
const LIMIT_IMPORTANT = 3;
const LLM_ITEM_LIMIT = 8;
const IMPORTANT_LOOKAHEAD_DAYS = 7;
const IMPORTANT_SUBTYPES: TeamMeetingSubtype[] = ['demo'];
const TOP_CAT_LIMIT = 3;

export type FetchMeetingsUpcomingResponse = {
  llm: MeetingRecapForLLM;
  full: {
    fullMeetings: UpcomingCalendarEvent[];
  };
};

export function minutesForRow(r: {
  durationMinutes: number | null;
  startAt: Date;
  endAt: Date;
}) {
  if (typeof r.durationMinutes === 'number' && r.durationMinutes >= 0)
    return r.durationMinutes;
  return Math.max(0, differenceInMinutes(r.endAt, r.startAt));
}

export async function fetchMeetingsUpcoming(params: {
  tenantId: string;
  timezone: string;
  now?: Date;
}): Promise<FetchMeetingsUpcomingResponse> {
  const { tenantId, timezone, now = new Date() } = params;

  const todayEnd = endOfDayServer(now, timezone);
  const importantEnd = addDays(todayEnd, IMPORTANT_LOOKAHEAD_DAYS);

  const baseWhere = and(
    eq(calendarEvents.tenantId, tenantId),
    isNull(calendarEvents.deletedAt),
    ne(calendarEvents.status, 'cancelled'),
    ne(calendarEvents.selfResponseStatus, 'declined'),
    notInArray(calendarEvents.category, ['personal', 'focus', 'ooo'])
  );

  const todayRows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        baseWhere,
        gte(calendarEvents.startAt, now),
        lt(calendarEvents.startAt, todayEnd),
        eq(calendarEvents.isAllDay, false)
      )
    )
    .orderBy(asc(calendarEvents.startAt))
    .limit(LIMIT_TODAY);

  const importantRows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        baseWhere,
        gte(calendarEvents.startAt, now),
        lt(calendarEvents.startAt, importantEnd),
        eq(calendarEvents.isAllDay, false),
        inArray(
          calendarEvents.categorySubtype,
          IMPORTANT_SUBTYPES as unknown as string[]
        )
      )
    )
    .orderBy(asc(calendarEvents.startAt))
    .limit(LIMIT_IMPORTANT);

  const todayIds = new Set(todayRows.map((r) => r.id));
  const importantDeduped = importantRows.filter((r) => !todayIds.has(r.id));

  const combined = [...todayRows, ...importantDeduped];

  const meetingCountToday = todayRows.length;
  const minutesToday = todayRows.reduce((sum, r) => sum + minutesForRow(r), 0);

  const byCat = new Map<CalendarEventCategory, number>();
  for (const r of todayRows) {
    const c = r.category as CalendarEventCategory;
    byCat.set(c, (byCat.get(c) ?? 0) + minutesForRow(r));
  }

  const topCategories = Array.from(byCat.entries())
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, TOP_CAT_LIMIT);

  const llmItems: CalendarEventForLLM[] = combined
    .sort((a, b) => {
      const dm = minutesForRow(b) - minutesForRow(a);
      if (dm !== 0) return dm;
      return a.startAt.getTime() - b.startAt.getTime();
    })
    .slice(0, LLM_ITEM_LIMIT)
    .map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      isAllDay: !!r.isAllDay,
      durationMinutes:
        r.durationMinutes ?? (r.endAt ? minutesBetween(r.startAt, r.endAt) : 0),
      title: r.title ?? null,
      category: (r.category ?? 'other') as CalendarEventCategory,
      subtype: (r.categorySubtype as any) ?? null,
      attendeesTotal: r.attendeesTotal,
      selfResponseStatus: r.selfResponseStatus,
    }))
    .slice(0, 10);

  const fullMeetings: UpcomingCalendarEvent[] = combined.map((r) =>
    formatCalendarEventResponse(r)
  );

  return {
    llm: {
      recap: {
        meetingCount: meetingCountToday,
        meetingMinutes: minutesToday,
        topCategories,
      },
      items: llmItems,
    },
    full: {
      fullMeetings,
    },
  };
}
