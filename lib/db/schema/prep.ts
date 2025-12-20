import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  index,
  integer,
  boolean,
  real,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import {
  OneOnOneMetricSnapshot,
  OneOnOneTalkingPoint,
} from '@/types/api/one-on-one';
import { Insight } from '@/types/api/insights';
import { ActivityEvent } from '@/types/api/timeline';
import { calendarEvents } from './gcal';

export const oneOnOneStatusEnum = pgEnum('one_on_one_status', [
  'pending',
  'generating',
  'ready',
  'archived',
]);

export const counterpartTypeEnum = pgEnum('one_on_one_counterpart_type', [
  'manager',
  'peer',
  'direct_report',
  'other',
]);

export type OneOnOnePayload = {
  talkingPoints: OneOnOneTalkingPoint[];
  usedInsights: Insight[];
  usedMetrics: OneOnOneMetricSnapshot[];
  usedPrs: ActivityEvent[];
  usedReviews: ActivityEvent[];
};

export const oneOnOneSessions = pgTable(
  'one_on_one_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // When this 1:1 is scheduled / happened (user’s local perception)
    meetingAt: timestamp('meeting_at', { withTimezone: true }).notNull(),

    // Who this 1:1 is with (freeform, user-controlled)
    counterpartLabel: text('counterpart_label'),
    counterpartType: counterpartTypeEnum('counterpart_type')
      .notNull()
      .default('manager'),

    // Time windows used to generate the prep
    shortWindowWeeks: integer('short_window_weeks').notNull().default(2),
    shortWindowStart: timestamp('short_window_start', {
      withTimezone: true,
    }).notNull(),
    shortWindowEnd: timestamp('short_window_end', {
      withTimezone: true,
    }).notNull(),
    mediumWindowStart: timestamp('medium_window_start', {
      withTimezone: true,
    }).notNull(),
    mediumWindowEnd: timestamp('medium_window_end', {
      withTimezone: true,
    }).notNull(),

    status: oneOnOneStatusEnum('status').notNull().default('ready'),
    title: text('title'),
    payload: jsonb('payload').$type<OneOnOnePayload>().notNull(),
  },
  (table) => ({
    uniqueOneOnOne: unique().on(
      table.tenantId,
      table.meetingAt,
      table.counterpartType
    ),
    byTenant: index('one_on_one_sessions_tenant_idx').on(table.tenantId),
  })
);

export type OneOnOneSession = typeof oneOnOneSessions.$inferSelect;
export type NewOneOnOneSession = typeof oneOnOneSessions.$inferInsert;

export type PrepItemStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'archived'
  | 'dismissed';

export type PrepMeetingType = 'oneOnOne' | 'standup' | 'planning' | 'retro';

export type PrepPayload = OneOnOnePayload | {};

export const prepItems = pgTable(
  'prep_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    calendarEventId: uuid('calendar_event_id').references(
      () => calendarEvents.id,
      {
        onDelete: 'set null',
      }
    ),

    // Can be from calendar or created manually
    source: text('source')
      .notNull()
      .$type<'calendar' | 'manual'>()
      .default('calendar'),
    manualKey: text('manual_key'),
    calendarId: text('calendar_id'), // from google
    googleEventId: text('google_event_id'),
    recurringEventId: text('recurring_event_id'),

    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),
    isAllDay: boolean('is_all_day').notNull().default(false),
    titleRedacted: text('title_redacted'),

    timezone: text('timezone').notNull(),
    primaryWindowStartAt: timestamp('primary_window_start_at', {
      withTimezone: true,
    }).notNull(),
    primaryWindowEndAt: timestamp('primary_window_end_at', {
      withTimezone: true,
    }).notNull(),
    primaryWindowSource: text('primary_window_source').notNull(),
    secondaryWindowStartAt: timestamp('secondary_window_start_at', {
      withTimezone: true,
    }).notNull(),
    secondaryWindowEndAt: timestamp('secondary_window_end_at', {
      withTimezone: true,
    }).notNull(),
    secondaryWindowSource: text('secondary_window_source').notNull(),

    category: text('category'), // 'team' | 'oneOnOne' | ...
    categorySubtype: text('category_subtype'), // 'designReview' etc
    categoryConfidence: real('category_confidence'),
    categorySource: text('category_source'), // heuristic|llm|user

    meetingType: text('meeting_type').$type<PrepMeetingType>().notNull(),
    status: text('status').notNull().$type<PrepItemStatus>().default('ready'),
    content: jsonb('content').$type<PrepPayload>(),
    lastError: text('last_error'),

    generationVersion: integer('generation_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqByTenantAndEvent: unique().on(
      t.tenantId,
      t.calendarId,
      t.googleEventId
    ),
    uniqByTenantAndManualKey: unique().on(t.tenantId, t.manualKey),
    uniqByTenantAndCalendarEvent: unique().on(t.tenantId, t.calendarEventId),
    idxByTenantAndStart: index('prep_items_tenant_start_idx').on(
      t.tenantId,
      t.startAt
    ),
    idxByTenantAndRecurring: index('prep_items_tenant_recurring_idx').on(
      t.tenantId,
      t.recurringEventId
    ),
  })
);

export type PrepItem = typeof prepItems.$inferSelect;

// export const prepRules = pgTable(
//   'prep_rules',
//   {
//     id: uuid('id').defaultRandom().primaryKey(),
//     tenantId: uuid('tenant_id').notNull(),
//     integrationTokenId: uuid('integration_token_id').references(
//       () => integrationTokens.id,
//       { onDelete: 'set null' }
//     ),
//     calendarId: text('calendar_id').notNull(),
//     recurringEventId: text('recurring_event_id').notNull(),
//     meetingType: text('meeting_type').$type<PrepMeetingType>().notNull(),
//     isEnabled: boolean('is_enabled').notNull().default(true),
//     // How far in advance to generate
//     leadTimeMinutes: integer('lead_time_minutes').notNull().default(60),
//     createdAt: timestamp('created_at', { withTimezone: true })
//       .notNull()
//       .defaultNow(),
//     updatedAt: timestamp('updated_at', { withTimezone: true })
//       .notNull()
//       .defaultNow(),
//   },
//   (t) => ({
//     uniqByTenantAndSeries: unique().on(
//       t.tenantId,
//       t.calendarId,
//       t.recurringEventId
//     ),
//     idxByTenantEnabled: index('prep_rules_tenant_enabled_idx').on(
//       t.tenantId,
//       t.isEnabled
//     ),
//   })
// );
