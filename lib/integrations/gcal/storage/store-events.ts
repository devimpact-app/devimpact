import { minutesBetween } from '@/lib/utils/date';
import { GoogleEventsListItem } from '../types';
import { parseGoogleDateTime, summarizeAttendees } from './helpers';
import { db } from '@/lib/db/client';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { sql } from 'drizzle-orm';
import { categorizeEvent } from '../sync/categorizer';

type UpsertCalendarEventsArgs = {
  tenantId: string;
  integrationTokenId: string;
  calendarId: string;
  events: GoogleEventsListItem[];
  lastSyncedAt: Date;
};

export async function upsertCalendarEvents({
  tenantId,
  integrationTokenId,
  calendarId,
  events,
  lastSyncedAt,
}: UpsertCalendarEventsArgs) {
  if (!events.length) return { upserted: 0 };

  const rows = events
    // Cancelled should already not be returned, but add here just incase
    .filter((e) => e.status !== 'cancelled')
    .map((e) => {
      const startAt = parseGoogleDateTime(e.start);
      const endAt = parseGoogleDateTime(e.end);
      if (!startAt || !endAt) return null;

      const isAllDay = Boolean(e.start?.date && !e.start?.dateTime);
      const durationMinutes = !isAllDay ? minutesBetween(startAt, endAt) : null;

      const originalStartAt = parseGoogleDateTime(e.originalStartTime);

      const attendeeAgg = summarizeAttendees(e.attendees);

      const tz = e.start?.timeZone ?? e.end?.timeZone ?? null;

      const categoryInfo = categorizeEvent({
        title: e.summary,
        eventType: e.eventType,
        attendeeInfo: attendeeAgg,
        isAllDay,
        durationMinutes,
        isRecurring: !!e.recurringEventId,
      });

      return {
        tenantId,
        integrationTokenId,
        calendarId,

        googleEventId: e.id,
        recurringEventId: e.recurringEventId ?? null,
        iCalUid: e.iCalUID ?? null,
        sequence: e.sequence ?? null,

        status: e.status ?? null,
        eventType: e.eventType ?? null,

        startAt,
        endAt,
        durationMinutes,
        originalStartAt,

        isAllDay,
        eventTimeZone: tz,

        title: e.summary?.trim() ?? null,

        ...attendeeAgg,
        ...categoryInfo,

        createdAtGoogle: e.created ? new Date(e.created) : null,
        updatedAtGoogle: e.updated ? new Date(e.updated) : null,

        lastSyncedAt,
        deletedAt: null,
        updatedAt: new Date(),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  if (!rows.length) return { upserted: 0 };

  // chunk to avoid gigantic inserts
  const CHUNK = 500;
  let total = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

    await db
      .insert(calendarEvents)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          calendarEvents.tenantId,
          calendarEvents.integrationTokenId,
          calendarEvents.calendarId,
          calendarEvents.googleEventId,
        ],
        set: {
          recurringEventId: sql`excluded.recurring_event_id`,
          iCalUid: sql`excluded.ical_uid`,
          sequence: sql`excluded.sequence`,

          status: sql`excluded.status`,
          eventType: sql`excluded.event_type`,

          startAt: sql`excluded.start_at`,
          endAt: sql`excluded.end_at`,
          durationMinutes: sql`excluded.duration_minutes`,
          originalStartAt: sql`excluded.original_start_at`,
          isAllDay: sql`excluded.is_all_day`,
          eventTimeZone: sql`excluded.event_time_zone`,
          title: sql`excluded.title_redacted`,

          attendeesTotal: sql`excluded.attendees_total`,
          attendeesAccepted: sql`excluded.attendees_accepted`,
          attendeesDeclined: sql`excluded.attendees_declined`,
          attendeesNeedsAction: sql`excluded.attendees_needs_action`,
          selfResponseStatus: sql`excluded.self_response_status`,
          isOrganizerSelf: sql`excluded.is_organizer_self`,

          createdAtGoogle: sql`excluded.created_at_google`,
          updatedAtGoogle: sql`excluded.updated_at_google`,

          lastSyncedAt: sql`excluded.last_synced_at`,
          deletedAt: null, // revive if previously soft-deleted
          updatedAt: new Date(),
        },
      });

    total += chunk.length;
  }

  return { upserted: total };
}
