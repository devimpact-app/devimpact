import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import {
  OneOnOneMetricSnapshot,
  OneOnOneTalkingPoint,
} from '@/types/api/one-on-one';
import { Insight } from '@/types/api/insights';

export const oneOnOneStatusEnum = pgEnum('one_on_one_status', [
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
  summary: string;
  talkingPoints: OneOnOneTalkingPoint[];
  usedInsights: Insight[];
  usedMetrics: OneOnOneMetricSnapshot[];
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
