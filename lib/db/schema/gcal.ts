import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  integer,
  pgEnum,
  unique,
  real,
} from 'drizzle-orm/pg-core';
import { integrationTokens, users } from './users';

export const calendarSelections = pgTable(
  'calendar_selections',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    integrationTokenId: uuid('integration_token_id')
      .notNull()
      .references(() => integrationTokens.id, { onDelete: 'cascade' }),

    isSelected: boolean('is_selected').notNull().default(false),

    // From Gcal
    calendarId: text('calendar_id').notNull(),
    summary: text('summary').notNull(),
    timeZone: text('time_zone'),
    accessRole: text('access_role'), // owner | writer | reader | freeBusyReader
    isPrimary: boolean('is_primary').default(false),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    byTenant: index('calendar_selections_tenant_idx').on(table.tenantId),
    uniqPerTenant: unique().on(
      table.tenantId,
      table.integrationTokenId,
      table.calendarId
    ),
  })
);

export const calendarSyncStatusEnum = pgEnum('calendar_sync_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const calendarSyncModeEnum = pgEnum('calendar_sync_mode', [
  'initial', // first-ever backfill
  'manual', // user-triggered
  'dashboard_refresh',
  'scheduled', // future
]);

export const calendarSyncRuns = pgTable(
  'calendar_sync_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    integrationTokenId: uuid('integration_token_id')
      .notNull()
      .references(() => integrationTokens.id, { onDelete: 'cascade' }),

    status: calendarSyncStatusEnum('status').notNull().default('pending'),
    mode: calendarSyncModeEnum('mode').notNull(),
    lookbackDays: integer('lookback_days'),

    windowStartAt: timestamp('window_start_at', {
      withTimezone: true,
    }).notNull(),
    windowEndAt: timestamp('window_end_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    errorCode: text('error_code'),
    errorMessage: text('error_message'),

    calendarsSyncedCount: integer('calendars_synced_count').default(0),
    eventsUpsertedCount: integer('events_upserted_count').default(0),

    nextSyncAfter: timestamp('next_sync_after', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    byStartedAt: index('calendar_sync_runs_recent_idx').on(
      table.tenantId,
      table.startedAt
    ),
  })
);

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tenantId: uuid('tenant_id').notNull(),
    integrationTokenId: uuid('integration_token_id').references(
      () => integrationTokens.id,
      { onDelete: 'set null' }
    ),

    calendarId: text('calendar_id').notNull(),
    googleEventId: text('google_event_id').notNull(),
    recurringEventId: text('recurring_event_id'),
    iCalUid: text('ical_uid'),
    sequence: integer('sequence'),

    status: text('status'), // confirmed/cancelled/tentative
    eventType: text('event_type'), // default, outOfOffice, etc
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes'),
    originalStartAt: timestamp('original_start_at', { withTimezone: true }),
    isAllDay: boolean('is_all_day').notNull().default(false),
    eventTimeZone: text('event_time_zone'),
    title: text('title_redacted'), // only keywords

    attendeesTotal: integer('attendees_total').notNull().default(0),
    attendeesAccepted: integer('attendees_accepted').notNull().default(0),
    attendeesDeclined: integer('attendees_declined').notNull().default(0),
    attendeesNeedsAction: integer('attendees_needs_action')
      .notNull()
      .default(0),
    selfResponseStatus: text('self_response_status'), // accepted/needsAction/declined/tentative
    isOrganizerSelf: boolean('is_organizer_self').notNull().default(false),

    category: text('category'), // flexible string label
    categorySubtype: text('category_subtype'), // e.g. for team meetings
    categoryConfidence: real('category_confidence'), // 0..1
    categorySource: text('category_source'), // heuristic|llm|user
    categoryVersion: integer('category_version').notNull().default(1),

    createdAtGoogle: timestamp('created_at_google', { withTimezone: true }),
    updatedAtGoogle: timestamp('updated_at_google', { withTimezone: true }),

    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqByTenant: unique().on(
      t.tenantId,
      t.integrationTokenId,
      t.calendarId,
      t.googleEventId
    ),
  })
);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
