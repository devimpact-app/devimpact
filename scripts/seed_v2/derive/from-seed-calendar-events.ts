import { NewCalendarEvent } from '@/lib/db/schema/gcal';
import { addMinutes } from '@/lib/utils/date'; // adjust import (or inline)
import { dateForDayIndex, SeedTimeContext } from '../helpers';
import {
  SeedOneOffEvent,
  SeedRecurringSeries,
} from '../schema/seedCalendarEvent';

function weekIndexForDayIndex(dayIndex: number): number {
  return Math.floor(dayIndex / 7);
}

function dayOfWeekForDayIndex(dayIndex: number): number {
  return dayIndex % 7;
}

function clampConfidence(n: number | null | undefined) {
  if (n == null) return null;
  return Math.max(0, Math.min(1, n));
}

export function seedRecurringSeriesToDbRows(
  series: SeedRecurringSeries,
  {
    tenantId,
    integrationTokenId,
    calendarId,
    timeCtx,
  }: {
    tenantId: string;
    integrationTokenId: string | null;
    calendarId: string;
    timeCtx: SeedTimeContext;
  }
): NewCalendarEvent[] {
  const s = series;
  const rows: NewCalendarEvent[] = [];

  const tz = s.timezone ?? 'America/Los_Angeles';

  const start = s.window.startDayIndex;
  const end = s.window.endDayIndex;

  const daysSet = new Set<number>(s.daysOfWeek);
  const skipSet = new Set<number>(s.skipDayIndices ?? []);

  const everyNWeeks = s.everyNWeeks ?? 1;
  const weekOffset = s.weekOffset ?? 0;

  for (let dayIndex = start; dayIndex <= end; dayIndex++) {
    if (skipSet.has(dayIndex)) continue;

    const dow = dayOfWeekForDayIndex(dayIndex);
    if (!daysSet.has(dow)) continue;

    const wk = weekIndexForDayIndex(dayIndex);
    if (everyNWeeks > 1) {
      if (wk % everyNWeeks !== weekOffset) continue;
    }

    const startAt = dateForDayIndex(timeCtx, dayIndex, s.startTime);
    const endAt = addMinutes(startAt, s.durationMinutes);

    const googleEventId = `seed:${s.seriesKey}:${dayIndex}`;
    const recurringEventId = `seed:series:${s.seriesKey}`;
    const iCalUid = `seed-ical:${s.seriesKey}`;

    const attendeesTotal = s.attendeesTotal ?? 6;

    rows.push({
      tenantId,
      integrationTokenId,
      calendarId,
      googleEventId,
      recurringEventId,
      iCalUid,
      sequence: 0,
      status: 'confirmed',
      eventType: 'default',
      startAt,
      endAt,
      durationMinutes: s.durationMinutes,
      originalStartAt: null,
      isAllDay: false,
      eventTimeZone: tz,
      title: s.title,
      attendeesTotal,
      attendeesAccepted:
        s.selfResponseStatus === 'accepted'
          ? Math.max(1, Math.floor(attendeesTotal * 0.6))
          : 0,
      attendeesDeclined: 0,
      attendeesNeedsAction:
        s.selfResponseStatus === 'needsAction'
          ? Math.max(1, Math.floor(attendeesTotal * 0.2))
          : 0,
      selfResponseStatus: s.selfResponseStatus,
      isOrganizerSelf: s.isOrganizerSelf,
      category: s.category,
      categorySubtype: s.subtype ?? null,
      categoryConfidence: clampConfidence(0.95),
      categorySource: 'seed',
      categoryVersion: 1,
      createdAtGoogle: startAt,
      updatedAtGoogle: startAt,
      lastSyncedAt: timeCtx.now,
      deletedAt: null,
      createdAt: timeCtx.now,
      updatedAt: timeCtx.now,
    });
  }

  return rows;
}

export function seedOneOffEventsToDbRows(
  events: SeedOneOffEvent[],
  {
    tenantId,
    integrationTokenId,
    calendarId,
    timeCtx,
  }: {
    tenantId: string;
    integrationTokenId: string | null;
    calendarId: string;
    timeCtx: SeedTimeContext;
  }
): NewCalendarEvent[] {
  return events.map((e, idx) => {
    const tz = e.timezone ?? 'America/Los_Angeles';

    let startAt: Date;
    let endAt: Date | null = null;

    if (e.isAllDay) {
      // All-day events start at midnight local time
      startAt = new Date(timeCtx.startMonday);
      startAt.setDate(startAt.getDate() + e.dayIndex);
      startAt.setHours(0, 0, 0, 0);

      endAt = new Date(startAt);
      endAt.setDate(endAt.getDate() + 1);
    } else {
      if (!e.startTime) {
        throw new Error(
          `Seed one-off event "${e.title}" requires startTime when isAllDay=false`
        );
      }

      startAt = dateForDayIndex(timeCtx, e.dayIndex, e.startTime);
      endAt = addMinutes(startAt, e.durationMinutes);
    }

    const googleEventId = `seed:oneoff:${idx}:${e.dayIndex}`;

    return {
      tenantId,
      integrationTokenId,
      calendarId,

      googleEventId,
      recurringEventId: null,
      iCalUid: null,
      sequence: 0,

      status: 'confirmed',
      eventType: 'default',

      startAt,
      endAt,
      durationMinutes: e.isAllDay ? null : e.durationMinutes,
      originalStartAt: null,
      isAllDay: e.isAllDay,
      eventTimeZone: tz,
      title: e.title,

      attendeesTotal: e.attendeesTotal ?? 6,
      attendeesAccepted: e.selfResponseStatus === 'accepted' ? 1 : 0,
      attendeesDeclined: e.selfResponseStatus === 'declined' ? 1 : 0,
      attendeesNeedsAction: e.selfResponseStatus === 'needsAction' ? 1 : 0,
      selfResponseStatus: e.selfResponseStatus,
      isOrganizerSelf: e.isOrganizerSelf,

      category: e.category,
      categorySubtype: e.subtype ?? null,
      categoryConfidence: 0.9,
      categorySource: 'seed',
      categoryVersion: 1,

      createdAtGoogle: startAt,
      updatedAtGoogle: startAt,

      lastSyncedAt: timeCtx.now,
      deletedAt: null,

      createdAt: timeCtx.now,
      updatedAt: timeCtx.now,
    };
  });
}
