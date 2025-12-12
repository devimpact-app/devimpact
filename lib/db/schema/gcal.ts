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
    lookbackDays: integer('lookback_days').notNull(),

    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    errorCode: text('error_code'),
    errorMessage: text('error_message'),

    calendarsSyncedCount: integer('calendars_synced_count').default(0),
    eventsUpsertedCount: integer('events_upserted_count').default(0),

    nextSyncAfter: timestamp('next_sync_after', { withTimezone: true }),
  },
  (table) => ({
    byStartedAt: index('calendar_sync_runs_recent_idx').on(
      table.tenantId,
      table.startedAt
    ),
  })
);
