import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const jobStatusEnum = pgEnum('job_status', [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);

export const jobKindEnum = pgEnum('job_kind', [
  // setup / orchestration
  'setup_bootstrap_recent',
  'setup_backfill_90d',

  // PR summarization
  'pr_summarize_recent',
  'pr_summarize_backfill',

  // threading
  'threading_recent',
  'threading_backfill',
  'threading_reconcile_deferred',

  // weekly summary
  'weekly_summary_generate_week',
  'weekly_summary_latest',
]);

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    kind: jobKindEnum('kind').notNull(),
    status: jobStatusEnum('status').notNull().default('queued'),
    priority: integer('priority').notNull().default(100),
    nextRunAt: timestamp('next_run_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by'),
    dedupeKey: text('dedupe_key').notNull(),
    lockExpiresAt: timestamp('lock_expires_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    // Optional - if parent job triggered this
    parentJobId: uuid('parent_job_id'),
    // Params jsonb
    payload: jsonb('payload').notNull().default({}),
    // Cursor jsonb
    cursor: jsonb('cursor').notNull().default({}),
    progress: jsonb('progress').notNull().default({}),
    // Results object to display things on FE
    result: jsonb('result').notNull().default({}),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byTenantKindStatus: index('jobs_tenant_kind_status_idx').on(
      t.tenantId,
      t.kind,
      t.status
    ),
    byStatusRunAtPriority: index('jobs_status_runat_priority_idx').on(
      t.status,
      t.nextRunAt,
      t.priority
    ),
    byParent: index('jobs_parent_idx').on(t.parentJobId),
  })
);

export type Job = typeof jobs.$inferSelect;

export const jobsSingletonActiveIndexSql = sql`
  CREATE UNIQUE INDEX IF NOT EXISTS jobs_singleton_active
  ON jobs (tenant_id, kind, dedupe_key)
  WHERE status IN ('queued','running');
`;
