import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const weeklySummaryStatusEnum = pgEnum('weekly_summary_status', [
  'pending', // queued / created but not started
  'generating', // in-flight
  'ready', // generated successfully
  'failed', // errored
  'skipped', // intentionally skipped (e.g., no data)
]);

export type WeeklySummaryBullet = {
  text: string;
  referencedThreadIds?: string[];
  referencedEventIds?: string[];
};

export type WeeklySummaryOutput = {
  headline: string;
  bullets: WeeklySummaryBullet[];
};

export const weeklySummaries = pgTable(
  'weekly_summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    weekStartLocalDate: text('week_start_local_date').notNull(), // 'YYYY-MM-DD' (Monday)
    timezone: text('timezone').notNull(), // IANA tz like 'America/Los_Angeles'
    rangeStartUtc: timestamp('range_start_utc', {
      withTimezone: true,
    }).notNull(),
    rangeEndUtc: timestamp('range_end_utc', { withTimezone: true }).notNull(),

    status: weeklySummaryStatusEnum('status').notNull().default('pending'),
    generationStartedAt: timestamp('generation_started_at', {
      withTimezone: true,
    }),
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    claimedBy: text('claimed_by'),
    claimExpiresAt: timestamp('claim_expires_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    emailedAt: timestamp('emailed_at', { withTimezone: true }),

    output: jsonb('output').$type<WeeklySummaryOutput | null>().default(null),
    referencedThreadIds: jsonb('referenced_thread_ids')
      .$type<string[]>()
      .notNull()
      .default([]),
    referencedEventIds: jsonb('referenced_event_ids')
      .$type<string[]>()
      .notNull()
      .default([]),

    model: text('model'), // e.g. 'gpt-4.1-mini'
    promptVersion: text('prompt_version'), // e.g. 'weekly_summary_v1'
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$onUpdateFn(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqTenantWeek: unique('weekly_summaries_uniq_tenant_week').on(
      t.tenantId,
      t.weekStartLocalDate,
      t.timezone
    ),
    tenantWeekIdx: index('weekly_summaries_tenant_week_idx').on(
      t.tenantId,
      t.weekStartLocalDate
    ),
    tenantStatusIdx: index('weekly_summaries_tenant_status_idx').on(
      t.tenantId,
      t.status,
      t.weekStartLocalDate
    ),
    tenantEmailedIdx: index('weekly_summaries_tenant_emailed_idx').on(
      t.tenantId,
      t.emailedAt
    ),
    tenantRangeIdx: index('weekly_summaries_tenant_range_idx').on(
      t.tenantId,
      t.rangeStartUtc,
      t.rangeEndUtc
    ),
  })
);

export type WeeklySummary = typeof weeklySummaries.$inferSelect;
export type NewWeeklySummary = typeof weeklySummaries.$inferInsert;
