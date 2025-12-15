import { ActivityQueryParams } from './types';
import { CalendarEvent, calendarEvents } from '@/lib/db/schema/gcal';
import { db } from '@/lib/db/client';
import { and, asc, eq, gt, inArray, lt, not } from 'drizzle-orm';
import { CalendarEventCategory } from '@/lib/integrations/gcal/sync/categorizer';

export const PERSONAL_EVENT_CATEGORIES: CalendarEventCategory[] = [
  'focus',
  'personal',
  'ooo',
];

export async function getCalendarEventsForRange(
  params: ActivityQueryParams,
  opts?: {
    includePersonal?: boolean;
  }
): Promise<CalendarEvent[]> {
  const { start, end, tenantId } = params;

  const includePersonal = opts?.includePersonal ?? false;

  const whereClauses = [
    eq(calendarEvents.tenantId, tenantId),
    lt(calendarEvents.startAt, end),
    gt(calendarEvents.endAt, start),
    not(eq(calendarEvents.selfResponseStatus, 'declined')),
  ];

  if (!includePersonal) {
    whereClauses.push(
      not(inArray(calendarEvents.category, PERSONAL_EVENT_CATEGORIES))
    );
  }

  const events = await db
    .select()
    .from(calendarEvents)
    .where(and(...whereClauses))
    .orderBy(asc(calendarEvents.startAt));

  return events;
}
