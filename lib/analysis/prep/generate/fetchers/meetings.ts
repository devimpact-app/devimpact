import { CalendarEventCategory } from '@/types/api/weekly-summary';
import { CalendarEventForLLM } from '../types';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { db } from '@/lib/db/client';
import { and, asc, eq, gte, isNull, lt, ne, notInArray } from 'drizzle-orm';
import { minutesBetween } from '@/lib/utils/date';
import { formatCalendarEventResponse } from '../../upcoming/formatResponse';

const FULL_LIMIT = 60;
const LLM_ITEM_LIMIT = 8;
const TOP_CAT_LIMIT = 5;

export type FetchMeetingsRecapResponse = {
  llm: {
    recap: {
      meetingCount: number;
      meetingMinutes: number;
      topCategories: {
        category: CalendarEventCategory;
        minutes: number;
      }[];
    };
    items: CalendarEventForLLM[];
  };
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
    notInArray(calendarEvents.category, ['personal', 'focus', 'ooo'])
  );

  const rows = await db
    .select()
    .from(calendarEvents)
    .where(where)
    .orderBy(asc(calendarEvents.startAt))
    .limit(FULL_LIMIT);

  const normalized = rows.map((r) => {
    const computedMinutes =
      r.durationMinutes ?? (r.endAt ? minutesBetween(r.startAt, r.endAt) : 0);

    // Keep all-day events in the list, but don't let them blow up "meetingMinutes"
    const effectiveMinutes = r.isAllDay ? 0 : computedMinutes;

    return {
      ...r,
      computedMinutes,
      effectiveMinutes,
      category: r.category ?? 'other',
      subtypeSafe: (r.categorySubtype ? String(r.categorySubtype) : null) as
        | string
        | null,
      titleSafe: (r.title ?? null) as string | null,
    };
  });

  const meetingCount = normalized.length;
  const meetingMinutes = normalized.reduce(
    (sum, r) => sum + (r.effectiveMinutes || 0),
    0
  );

  const byCat = new Map<CalendarEventCategory, number>();
  for (const r of normalized) {
    const c = r.category as CalendarEventCategory;
    byCat.set(c, (byCat.get(c) ?? 0) + (r.effectiveMinutes || 0));
  }

  const topCategories = Array.from(byCat.entries())
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, TOP_CAT_LIMIT);

  const llmItems = [...normalized]
    .sort((a, b) => {
      const dm = (b.effectiveMinutes || 0) - (a.effectiveMinutes || 0);
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
        title: r.titleSafe,
        category: r.category as CalendarEventCategory,
        subtype: (r.subtypeSafe as any) ?? null,
        durationMinutes: r.computedMinutes ?? null,
        attendeesTotal: r.attendeesTotal ?? 0,
        selfResponseStatus: (r.selfResponseStatus ?? null) as any,
      };
    });

  const now = new Date();
  const fullMeetings: UpcomingCalendarEvent[] = normalized.map((r) =>
    formatCalendarEventResponse(r, now)
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
