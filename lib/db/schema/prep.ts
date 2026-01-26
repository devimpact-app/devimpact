import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
  index,
  integer,
  boolean,
  real,
} from 'drizzle-orm/pg-core';
import { Insight } from '@/types/api/insights';
import { ActivityEvent } from '@/types/api/timeline';
import { calendarEvents } from './gcal';
import { PrepMetricSnapshot, PrepTalkingPoint } from '@/types/api/prep';

export type PrepItemStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'archived'
  | 'dismissed';

export type PrepMeetingType = 'oneOnOne' | 'standup' | 'planning' | 'retro';

export type PrepPayload =
  | {
      talkingPoints: PrepTalkingPoint[];
      usedInsights: Insight[];
      usedMetrics: PrepMetricSnapshot[];
      usedPrs: ActivityEvent[];
      usedReviews: ActivityEvent[];
    }
  | {};

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
    title: text('title_redacted'),

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
