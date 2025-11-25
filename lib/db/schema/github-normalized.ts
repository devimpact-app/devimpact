import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  real,
  unique,
  index,
  pgEnum,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { githubPrs, githubReviews } from './github-raw';

export const prSummaries = pgTable(
  'pr_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    prId: uuid('pull_request_id')
      .references(() => pullRequests.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    repoFullName: text('repo_full_name').notNull(), // "owner/repo"
    prNumber: integer('pr_number').notNull(),
    shortSummary: text('short_summary').notNull(),
    longSummary: text('long_summary'),
    highlights: jsonb('highlights').$type<string[]>().notNull().default([]),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    inputHash: text('input_hash'),
    model: text('model').notNull(), // e.g. "gpt-4.1-mini"
    promptVersion: text('prompt_version').notNull(), // e.g. "v1"
    prUpdatedAt: timestamp('pr_updated_at', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$onUpdateFn(() => new Date())
      .defaultNow(),
  },
  (t) => ({
    uniqPerTenantAndPr: unique().on(t.tenantId, t.prId),
    idxTenant: index('pr_summaries_tenant_idx').on(t.tenantId),
  })
);

export type PrSummary = typeof prSummaries.$inferSelect;

export const pullRequests = pgTable(
  'pull_requests',
  {
    // Identity (1:1 with github_prs)
    id: uuid('id').primaryKey().defaultRandom(),
    githubPrId: uuid('github_pr_id')
      .references(() => githubPrs.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    tenantId: uuid('tenant_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // Basic info (denormalized for query performance)
    prNumber: integer('pr_number').notNull(),
    repoFullName: text('repo_full_name').notNull(),
    title: text('title').notNull(),
    state: text('state').notNull(), // "open", "closed", "merged"
    prAuthorLogin: text('pr_author_login').notNull(),
    htmlUrl: text('html_url').notNull(),
    body: text('body').default('').notNull(),
    authorIsTenant: boolean('author_is_tenant').default(false).notNull(),

    // Key timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    mergedAt: timestamp('merged_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    firstCommitAt: timestamp('first_commit_at', { withTimezone: true }),
    lastReadyForReviewAt: timestamp('last_ready_for_review_at', {
      withTimezone: true,
    }),
    firstReviewAtForCycle: timestamp('first_review_at_for_cycle', {
      withTimezone: true,
    }),

    // first commit to ready for review
    authoringLeadSeconds: integer('authoring_lead_seconds'),
    // Ready for review to first review
    timeToFirstReviewSeconds: integer('time_to_first_review_seconds'),
    // First review to PR merge
    reviewToMergeSeconds: integer('review_to_merge_seconds'),
    // Total lead time from first commit to merge
    leadTimeSeconds: integer('lead_time_seconds'),
    // Ready for review to first approval
    timeToFirstApprovalSeconds: integer('time_to_first_approval_seconds'),

    // User's authored changes only
    linesAdded: integer('lines_added').default(0).notNull(),
    linesDeleted: integer('lines_deleted').default(0).notNull(),
    linesChanged: integer('lines_changed').default(0).notNull(), // added + deleted
    filesChanged: integer('files_changed').default(0).notNull(),

    // File type breakdown
    filesAdded: integer('files_added').default(0).notNull(), // status = "added"
    filesModified: integer('files_modified').default(0).notNull(), // status = "modified"
    filesDeleted: integer('files_deleted').default(0).notNull(), // status = "deleted"
    filesRenamed: integer('files_renamed').default(0).notNull(), // status = "renamed"

    // Test coverage indicator
    touchedTests: boolean('touched_tests').default(false).notNull(),
    testFilesChanged: integer('test_files_changed').default(0).notNull(),

    // Complexity indicators
    largestFileChanged: integer('largest_file_changed').default(0).notNull(), // Max changes in a single file
    avgChangesPerFile: real('avg_changes_per_file').default(0).notNull(),
    commitsCount: integer('commits_count').default(0).notNull(), // User's commits only
    reviewsCount: integer('reviews_count').default(0).notNull(), // Total review submissions
    uniqueReviewers: integer('unique_reviewers').default(0).notNull(),
    selfReviewCommentsCount: integer('self_review_comments_count')
      .default(0)
      .notNull(),
    reviewCommentsCount: integer('review_comments_count').default(0).notNull(), // Code review comments

    approvalsCount: integer('approvals_count').default(0).notNull(),
    changesRequestedCount: integer('changes_requested_count')
      .default(0)
      .notNull(),
    reviewRounds: integer('review_rounds').default(0).notNull(),

    // Status checks
    wasApprovedBeforeMerge: boolean('was_approved_before_merge')
      .default(false)
      .notNull(),
    hadForcePushes: boolean('had_force_pushes').default(false).notNull(),

    // TODO: Add later
    // - ciFailuresCount
    // - wasReverted
    // - causedIncident
    // - hadBlockingReview
    // - participantsCount
    // - issueCommentsCount
    // - totalConversations
    // - churnRate (files / lines ratio)
    // - fileExtensions (jsonb)

    normalizedAt: timestamp('normalized_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    sourceUpdatedAt: timestamp('source_updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    normalizationVersion: integer('normalization_version').default(1).notNull(),
  },
  (table) => ({
    tenantIdx: index('pull_requests_tenant_idx').on(table.tenantId),
    repoIdx: index('pull_requests_repo_idx').on(table.repoFullName),
    stateIdx: index('pull_requests_state_idx').on(table.state),
    createdAtIdx: index('pull_requests_created_at_idx').on(table.createdAt),
    mergedAtIdx: index('pull_requests_merged_at_idx').on(table.mergedAt),
  })
);

export type PullRequest = typeof pullRequests.$inferSelect;

export const reviews = pgTable(
  'reviews',
  {
    // Identity (1:1 with github_reviews)
    id: uuid('id').primaryKey().defaultRandom(),
    githubReviewId: uuid('github_review_id')
      .notNull()
      .references(() => githubReviews.id, { onDelete: 'cascade' })
      .unique(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // PR linkage + small snapshot
    prId: uuid('pr_id')
      .notNull()
      .references(() => pullRequests.id, { onDelete: 'cascade' }),
    prNumber: integer('pr_number').notNull(),
    repoFullName: text('repo_full_name').notNull(), // "owner/repo"
    prAuthorLogin: text('pr_author_login').notNull(),

    // Reviewer basics
    reviewerLogin: text('reviewer_login').notNull(),
    reviewerIsTenant: boolean('reviewer_is_tenant').notNull().default(false),

    // Review basics
    state: text('state').notNull(), // "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING"
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    commitId: text('commit_id'),
    htmlUrl: text('html_url').notNull(),
    body: text('body').default('').notNull(),

    // Minimal timing/quality metrics (keep simple for MVP)
    reviewLatencySeconds: real('review_latency'),
    reviewAnchorAt: timestamp('review_anchor_at', { withTimezone: true }), // Anchor - either a review request or PR open
    reviewAnchorType: text('review_anchor_type').notNull(), // direct_request | team_request | draft_exit | first_request | pr_open
    anchorTeamSlug: text('anchor_team_slug'), // What team anchored with, if using

    // Simple decision helpers
    isApproval: boolean('is_approval').default(false).notNull(),
    isChangeRequest: boolean('is_change_request').default(false).notNull(),
    isCommentOnly: boolean('is_comment_only').default(false).notNull(),
    wasDirectlyRequested: boolean('was_directly_requested')
      .default(false)
      .notNull(),
    wasFirstReview: boolean('was_first_review').default(false).notNull(),
    reviewCommentsCount: integer('review_comments_count').default(0).notNull(), // number of code comments in this review

    // TODO: add later
    // - suggestion count
    // - feedbackStyle (LLM)
    // - feedback themes (LLM)
    // - code areas (directories/extensions)

    // Metadata
    normalizedAt: timestamp('normalized_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    sourceUpdatedAt: timestamp('source_updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    normalizationVersion: integer('normalization_version').default(1).notNull(),
  },
  (t) => ({
    // Common query paths
    tenantIdx: index('reviews_tenant_idx').on(t.tenantId),
    repoIdx: index('reviews_repo_idx').on(t.tenantId, t.repoFullName),
    reviewerIdx: index('reviews_reviewer_idx').on(
      t.tenantId,
      t.reviewerLogin,
      t.submittedAt
    ),
    reviewAnchorIdx: index('reviews_review_anchor_idx').on(
      t.tenantId,
      t.reviewerLogin,
      t.reviewAnchorType,
      t.submittedAt
    ),
    prIdx: index('reviews_pr_idx').on(t.tenantId, t.prId, t.submittedAt),
    stateIdx: index('reviews_state_idx').on(t.tenantId, t.state),
    submittedAtIdx: index('reviews_submitted_at_idx').on(
      t.tenantId,
      t.submittedAt
    ),
  })
);

export type Review = typeof reviews.$inferSelect;

// Enums
export const teamConfidenceEnum = pgEnum('team_confidence', [
  'low',
  'medium',
  'high',
]);
export const membershipSourceEnum = pgEnum('membership_source', [
  'heuristic',
  'api',
]);

export const inferredTeamMemberships = pgTable(
  'inferred_team_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // ownership (tenant=user for now)
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // identity
    githubLogin: text('github_login').notNull(),
    org: text('org').notNull(), // GitHub org login
    teamSlug: text('team_slug').notNull(), // team slug within org

    // provenance
    source: membershipSourceEnum('source').notNull().default('heuristic'),
    algoVersion: text('algo_version').notNull().default('v1'),

    // scoring
    score: real('score').notNull(), // 0..1 normalized
    confidence: teamConfidenceEnum('confidence').notNull(), // 'low'|'medium'|'high'

    // evidence snapshot (counts we used to compute score)
    evidenceCounts: jsonb('evidence_counts').notNull().$type<{
      reqToReview: number; // user reviewed when this team was requested
      userDirectRequests: number; // user was individually requested on those PRs
      totalReviewsAfterAnyTeamRequest: number; // denominator across all teams
      totalDirectRequestsAfterTeamRequest: number;
    }>(),

    // timestamps
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    // One row per (tenant, login, org, team, source)
    uniqPerSource: unique('itm_unique_per_source').on(
      t.tenantId,
      t.githubLogin,
      t.org,
      t.teamSlug,
      t.source
    ),

    // Helpful indexes
    byTenantLogin: index('itm_tenant_login_idx').on(t.tenantId, t.githubLogin),
    byTenantTeam: index('itm_tenant_team_idx').on(
      t.tenantId,
      t.org,
      t.teamSlug
    ),
    byTenantScore: index('itm_tenant_score_idx').on(t.tenantId, t.score),
  })
);

// Optional: Type helper
export type InferredTeamMembership =
  typeof inferredTeamMemberships.$inferSelect;
export type NewInferredTeamMembership =
  typeof inferredTeamMemberships.$inferInsert;
