import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { ActivityEventMetadata } from '@/types/api/threads';

export type ActivityEventKind = 'pr' | 'review' | 'meeting' | 'ooo';

export const activityEventSourceEnum = pgEnum('activity_event_source', [
  'github',
  'gcal',
]);

export const threadingStateEnum = pgEnum('threading_state', [
  'unprocessed',
  'in_progress',
  'threaded',
  'deferred',
  'final_skipped',
]);

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    source: activityEventSourceEnum('source').notNull(),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }), // meetings / ooo
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    url: text('url'),
    sourceEntityTable: text('source_entity_table').notNull(), // 'pull_requests' | 'reviews' | 'calendar_events'
    sourceEntityId: uuid('source_entity_id').notNull(),
    repoFullName: text('repo_full_name'),
    prNumber: integer('pr_number'),
    recurringEventId: text('recurring_event_id'),
    metadata: jsonb('metadata')
      .$type<ActivityEventMetadata | null>()
      .default(null),
    // Threading details
    threadingState: threadingStateEnum('threading_state')
      .notNull()
      .default('unprocessed'),
    threadingAttempts: integer('threading_attempts').notNull().default(0),
    threadingLastAttemptAt: timestamp('threading_last_attempt_at', {
      withTimezone: true,
    }),
    threadingDeferredAt: timestamp('threading_deferred_at', {
      withTimezone: true,
    }),
    threadingLastDecision: text('threading_last_decision'),
    threadingLastDecisionReason: text('threading_last_decision_reason'),
    threadingClaimedAt: timestamp('threading_claimed_at', {
      withTimezone: true,
    }),
    threadingClaimedBy: text('threading_claimed_by'),
    threadingClaimExpiresAt: timestamp('threading_claim_expires_at', {
      withTimezone: true,
    }),
    // Versioning
    derivedVersion: integer('derived_version').notNull().default(1),
    derivedAt: timestamp('derived_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: unique().on(
      t.tenantId,
      t.source,
      t.sourceEntityTable,
      t.sourceEntityId,
      t.eventType
    ),
    recurringIdx: index('activity_events_recurring_idx').on(
      t.tenantId,
      t.recurringEventId,
      t.occurredAt
    ),
    tenantOccurredIdx: index('activity_events_tenant_occurred_idx').on(
      t.tenantId,
      t.occurredAt
    ),
    tenantTypeIdx: index('activity_events_tenant_type_idx').on(
      t.tenantId,
      t.eventType,
      t.occurredAt
    ),
    threadingIdx: index('activity_events_threading_queue_idx').on(
      t.tenantId,
      t.threadingState,
      t.occurredAt,
      t.id
    ),
    repoIdx: index('activity_events_repo_idx').on(t.tenantId, t.repoFullName),
  })
);

export type ActivityEvent = typeof activityEvents.$inferSelect;

export const threadCategoryEnum = pgEnum('thread_category', [
  'features',
  'bugs_incidents',
  'tech_debt',
  'collaboration',
  'alignment',
  'skill_growth',
  'hiring',
]);

export type ThreadCategory =
  | 'features'
  | 'bugs_incidents'
  | 'tech_debt'
  | 'collaboration'
  | 'alignment'
  | 'skill_growth'
  | 'hiring';

export const threadStatusEnum = pgEnum('thread_status', ['active', 'archived']);

export const threads = pgTable(
  'threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryKey: threadCategoryEnum('category_key').notNull(),
    title: text('title').notNull(),
    titleUserEditedAt: timestamp('title_user_edited_at', {
      withTimezone: true,
    }),
    summary: text('summary').notNull().default(''),
    summaryHeadline: text('summary_headline').notNull().default(''),
    headlineUserEditedAt: timestamp('headline_user_edited_at', {
      withTimezone: true,
    }),
    summaryUpdatedAt: timestamp('summary_updated_at', { withTimezone: true }),
    summaryGeneratedAt: timestamp('summary_generated_at', {
      withTimezone: true,
    }),
    status: threadStatusEnum('status').notNull().default('active'),
    confidence: real('confidence'), // 0..1
    firstActivityAt: timestamp('first_activity_at', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    userEditedAt: timestamp('user_edited_at', { withTimezone: true }),
    lastUpdate: jsonb('last_update')
      .$type<{
        headline?: string;
        bullets?: string[];
        referencedEventIds: string[];
        generatedAt: string;
      } | null>()
      .default(null),
    model: text('model'), // e.g. "gpt-4.1-mini"
    promptVersion: text('prompt_version'), // e.g. "threads_v1"

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$onUpdateFn(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index('threads_tenant_idx').on(t.tenantId),
    tenantStatusLastIdx: index('threads_tenant_status_last_idx').on(
      t.tenantId,
      t.status,
      t.lastActivityAt
    ),
    tenantCategoryStatusLastIdx: index('threads_tenant_cat_status_last_idx').on(
      t.tenantId,
      t.categoryKey,
      t.status,
      t.lastActivityAt
    ),
    tenantLastIdx: index('threads_tenant_last_idx').on(
      t.tenantId,
      t.lastActivityAt
    ),
  })
);

export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;

export const threadBulletSourceEnum = pgEnum('thread_bullet_source', [
  'llm',
  'user',
]);

export const threadSummaryBullets = pgTable(
  'thread_summary_bullets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    sortIndex: integer('sort_index').notNull(), // 0..N
    text: text('text').notNull(),
    source: threadBulletSourceEnum('source').notNull().default('llm'),
    userEditedAt: timestamp('user_edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    referencedEventIds: jsonb('referenced_event_ids')
      .$type<string[]>()
      .notNull()
      .default([]),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    model: text('model'),
    promptVersion: text('prompt_version'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$onUpdateFn(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantThreadIdx: index('thread_summary_bullets_tenant_thread_idx').on(
      t.tenantId,
      t.threadId,
      t.sortIndex
    ),
  })
);

export type ThreadSummaryBullet = typeof threadSummaryBullets.$inferSelect;

export const threadEventAssignedByEnum = pgEnum('thread_event_assigned_by', [
  'llm',
  'user',
  'heuristic',
]);

export const threadEvents = pgTable(
  'thread_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    activityEventId: uuid('activity_event_id')
      .notNull()
      .references(() => activityEvents.id, { onDelete: 'cascade' }),
    assignedBy: threadEventAssignedByEnum('assigned_by').notNull(),
    assignmentConfidence: real('assignment_confidence'),
    assignmentReason: text('assignment_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqEvent: unique('thread_events_uniq_event').on(
      t.tenantId,
      t.activityEventId
    ),
    threadIdx: index('thread_events_thread_idx').on(t.tenantId, t.threadId),
    eventIdx: index('thread_events_event_idx').on(
      t.tenantId,
      t.activityEventId
    ),
  })
);

export type ThreadEvent = typeof threadEvents.$inferSelect;
export type NewThreadEvent = typeof threadEvents.$inferInsert;
