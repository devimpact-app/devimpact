import { PrepItem } from '@/lib/db/schema';
import { PrepItemResponse, PrepItemResponseSchema } from '@/types/api/prep';

export function formatPrepItemResponse(row: PrepItem) {
  const { content, ...r } = row;

  const c: any = content ?? {};

  const prep: PrepItemResponse['prep'] = {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    calendarEventId: r.calendarEventId ?? null,
    source: r.source,
    calendarId: r.calendarId ?? null,
    googleEventId: r.googleEventId ?? null,
    recurringEventId: r.recurringEventId ?? null,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt ? r.endAt.toISOString() : null,
    durationMinutes: r.durationMinutes ?? null,
    isAllDay: !!r.isAllDay,
    title: r.title ?? null,
    timezone: r.timezone,
    primaryWindow: {
      startAt: r.primaryWindowStartAt.toISOString(),
      endAt: r.primaryWindowEndAt.toISOString(),
      source: r.primaryWindowSource,
    },
    seconaryWindow: {
      startAt: r.secondaryWindowStartAt.toISOString(),
      endAt: r.secondaryWindowEndAt.toISOString(),
      source: r.secondaryWindowSource,
    },
    category: r.category ?? null,
    categorySubtype: r.categorySubtype ?? null,
    meetingType: r.meetingType,
    status: r.status,
    lastError: r.lastError ?? null,
    generationVersion: r.generationVersion,
    talkingPoints: Array.isArray(c.talkingPoints) ? c.talkingPoints : [],
    usedInsights: Array.isArray(c.usedInsights) ? c.usedInsights : [],
    usedSignals: Array.isArray(c.usedSignals) ? c.usedSignals : [],
    usedMetrics: Array.isArray(c.usedMetrics) ? c.usedMetrics : [],
    usedPrs: Array.isArray(c.usedPrs) ? c.usedPrs : [],
    usedReviews: Array.isArray(c.usedReviews) ? c.usedReviews : [],
    usedCalendarEvents: Array.isArray(c.usedCalendarEvents)
      ? c.usedCalendarEvents
      : [],
  };

  const parsed = PrepItemResponseSchema.safeParse({ prep });

  if (!parsed.success) {
    console.log('error', parsed.error);
    throw new Error('Failed to format prep response');
  }

  return parsed.data;
}
