import { CalendarEventCategory } from '@/types/api/weekly-summary';
import { CalendarEventForLLM, MeetingRecapForLLM } from '../types';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { db } from '@/lib/db/client';
import { and, asc, eq, gte, isNull, lt, ne, notInArray } from 'drizzle-orm';
import { formatCalendarEventResponse } from '../../upcoming/formatResponse';
import { minutesForRow } from './upcomingMeetings';

const FULL_LIMIT = 60;
const LLM_ITEM_LIMIT = 8;
const TOP_CAT_LIMIT = 5;

export type FetchMeetingsRecapResponse = {
  llm: MeetingRecapForLLM;
  full: {
    fullMeetings: UpcomingCalendarEvent[];
  };
};

export async function fetchMeetingsRecapPrimary(params: {
  tenantId: string;
  timezone: string;
  start: Date;
  end: Date;
}): Promise<FetchMeetingsRecapResponse> {
  const { tenantId, start, end } = params;

  const where = and(
    eq(calendarEvents.tenantId, tenantId),
    isNull(calendarEvents.deletedAt),
    gte(calendarEvents.startAt, start),
    lt(calendarEvents.startAt, end),
    ne(calendarEvents.status, 'cancelled'),
    ne(calendarEvents.selfResponseStatus, 'declined'),
    notInArray(calendarEvents.category, ['personal', 'focus', 'ooo']),
    eq(calendarEvents.isAllDay, false)
  );

  const rows = await db
    .select()
    .from(calendarEvents)
    .where(where)
    .orderBy(asc(calendarEvents.startAt))
    .limit(FULL_LIMIT);

  const meetingCount = rows.length;
  const meetingMinutes = rows.reduce((sum, r) => sum + minutesForRow(r), 0);

  const byCat = new Map<CalendarEventCategory, number>();
  for (const r of rows) {
    const c = r.category as CalendarEventCategory;
    byCat.set(c, (byCat.get(c) ?? 0) + minutesForRow(r));
  }

  const topCategories = Array.from(byCat.entries())
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, TOP_CAT_LIMIT);

  const llmItems = [...rows]
    .sort((a, b) => {
      const dm = minutesForRow(b) - minutesForRow(a);
      if (dm !== 0) return dm;
      return a.startAt.getTime() - b.startAt.getTime();
    })
    .slice(0, LLM_ITEM_LIMIT)
    .map((r): CalendarEventForLLM => {
      return {
        id: r.id,
        startAt: r.startAt.toISOString(),
        endAt: r.endAt.toISOString(),
        isAllDay: !!r.isAllDay,
        title: r.title,
        category: r.category as CalendarEventCategory,
        subtype: (r.categorySubtype as any) ?? null,
        durationMinutes: minutesForRow(r),
        attendeesTotal: r.attendeesTotal,
        selfResponseStatus: r.selfResponseStatus,
      };
    });

  const fullMeetings: UpcomingCalendarEvent[] = rows.map((r) =>
    formatCalendarEventResponse(r)
  );

  return {
    llm: {
      recap: {
        meetingCount,
        meetingMinutes,
        topCategories,
      },
      items: llmItems,
    },
    full: {
      fullMeetings,
    },
  };
}
