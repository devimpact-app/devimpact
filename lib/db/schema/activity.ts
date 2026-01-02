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

export type ActivityEventKind = 'pr' | 'review' | 'meeting' | 'ooo';

type ActivityEventMetadata =
  | {
      kind: 'pr';
      size: {
        linesChanged: number;
        filesChanged: number;
        commitsCount?: number;
      };
      shape: { touchedTests: boolean };
      process?: { reviewRounds?: number; uniqueReviewers?: number };
    }
  | {
      kind: 'review';
      decision: 'approved' | 'changes_requested' | 'commented';
      depth: { commentsCount: number };
      role: {
        wasDirectlyRequested: boolean;
        wasFirstReview?: boolean;
        isBlocking?: boolean;
      };
    }
  | {
      kind: 'meeting';
      participation: {
        selfResponseStatus:
          | 'accepted'
          | 'declined'
          | 'tentative'
          | 'needsAction';
        isOrganizerSelf: boolean;
      };
      structure: {
        isRecurring: boolean;
        recurringEventId?: string;
        durationMinutes: number;
        isAllDay: boolean;
      };
      classification?: {
        category?: string;
        categorySubtype?: string;
        categoryConfidence?: number;
        categorySource?: 'heuristic' | 'llm' | 'user';
      };
    }
  | { kind: 'ooo'; isAllDay: boolean; durationMinutes?: number };

export const activityEventSourceEnum = pgEnum('activity_event_source', [
  'github',
  'gcal',
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
    repoIdx: index('activity_events_repo_idx').on(t.tenantId, t.repoFullName),
  })
);
