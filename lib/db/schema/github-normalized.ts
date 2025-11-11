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
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { githubPrs } from "./github-raw";

/**
 * NORMALIZED PULL REQUESTS
 *
 * Pre-calculated metrics for fast querying.
 * Updated by normalization pipeline after raw data sync.
 */
export const pullRequests = pgTable(
  "pull_requests",
  {
    // Identity (1:1 with github_prs)
    id: uuid("id").primaryKey().defaultRandom(),
    githubPrId: uuid("github_pr_id")
      .references(() => githubPrs.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    tenantId: uuid("tenant_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    // Basic info (denormalized for query performance)
    prNumber: integer("pr_number").notNull(),
    repoFullName: text("repo_full_name").notNull(),
    title: text("title").notNull(),
    state: text("state").notNull(), // "open", "closed", "merged"

    // Key timestamps
    createdAt: timestamp("created_at").notNull(),
    mergedAt: timestamp("merged_at"), // From timeline events (more accurate)
    closedAt: timestamp("closed_at"),
    firstReviewAt: timestamp("first_review_at"), // When first review submitted

    // ==========================================
    // TIMING METRICS (in hours)
    // ==========================================
    timeToFirstReview: real("time_to_first_review"), // Creation to first review
    timeToMerge: real("time_to_merge"), // Creation to merge

    // TODO: Add later
    // - timeToFirstApproval
    // - authorActiveTime
    // - reviewActiveTime
    // - avgReviewTurnaround
    // - avgAuthorTurnaround

    // ==========================================
    // CODE METRICS
    // ==========================================

    // User's authored changes only
    linesAdded: integer("lines_added").default(0),
    linesDeleted: integer("lines_deleted").default(0),
    linesChanged: integer("lines_changed").default(0), // added + deleted
    filesChanged: integer("files_changed").default(0),

    // File type breakdown
    filesAdded: integer("files_added").default(0), // status = "added"
    filesModified: integer("files_modified").default(0), // status = "modified"
    filesDeleted: integer("files_deleted").default(0), // status = "deleted"
    filesRenamed: integer("files_renamed").default(0), // status = "renamed"

    // Test coverage indicator
    touchedTests: boolean("touched_tests").default(false), // Any is_test_file = true
    testFilesChanged: integer("test_files_changed").default(0),

    // Complexity indicators
    largestFileChanged: integer("largest_file_changed").default(0), // Max changes in a single file
    avgChangesPerFile: real("avg_changes_per_file"),
    commitsCount: integer("commits_count").default(0), // User's commits only

    // TODO: Add later
    // - churnRate (files / lines ratio)
    // - fileExtensions (jsonb)

    // ==========================================
    // REVIEW METRICS
    // ==========================================
    reviewsCount: integer("reviews_count").default(0), // Total review submissions
    uniqueReviewers: integer("unique_reviewers").default(0),
    reviewCommentsCount: integer("review_comments_count").default(0), // Code review comments

    approvalsCount: integer("approvals_count").default(0),
    changesRequestedCount: integer("changes_requested_count").default(0),

    reviewRounds: integer("review_rounds").default(0), // Feedback cycles

    // Status checks
    wasApprovedBeforeMerge: boolean("was_approved_before_merge").default(false),

    // TODO: Add later
    // - hadBlockingReview
    // - participantsCount
    // - issueCommentsCount
    // - totalConversations

    // ==========================================
    // QUALITY INDICATORS
    // ==========================================
    hadMergeConflicts: boolean("had_merge_conflicts").default(false),
    hadForcePushes: boolean("had_force_pushes").default(false),

    // TODO: Add later
    // - ciFailuresCount
    // - wasReverted
    // - causedIncident

    // ==========================================
    // METADATA
    // ==========================================
    normalizedAt: timestamp("normalized_at").defaultNow(),
    normalizationVersion: integer("normalization_version").default(1),
  },
  (table) => ({
    tenantIdx: index("pull_requests_tenant_idx").on(table.tenantId),
    repoIdx: index("pull_requests_repo_idx").on(table.repoFullName),
    stateIdx: index("pull_requests_state_idx").on(table.state),
    createdAtIdx: index("pull_requests_created_at_idx").on(table.createdAt),
    mergedAtIdx: index("pull_requests_merged_at_idx").on(table.mergedAt),
  }),
);

// Enums
export const teamConfidenceEnum = pgEnum("team_confidence", [
  "low",
  "medium",
  "high",
]);
export const membershipSourceEnum = pgEnum("membership_source", [
  "heuristic",
  "api",
]);

export const inferredTeamMemberships = pgTable(
  "inferred_team_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // ownership (tenant=user for now)
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // identity
    githubLogin: text("github_login").notNull(),
    org: text("org").notNull(), // GitHub org login
    teamSlug: text("team_slug").notNull(), // team slug within org

    // provenance
    source: membershipSourceEnum("source").notNull().default("heuristic"),
    algoVersion: text("algo_version").notNull().default("v1"),

    // scoring
    score: real("score").notNull(), // 0..1 normalized
    confidence: teamConfidenceEnum("confidence").notNull(), // 'low'|'medium'|'high'

    // evidence snapshot (counts we used to compute score)
    evidenceCounts: jsonb("evidence_counts").notNull().$type<{
      req_to_review: number; // user reviewed when this team was requested
      user_direct_requests: number; // user was individually requested on those PRs
      all_team_requested_reviews_for_login: number; // denominator across all teams
    }>(),

    // timestamps
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    // One row per (tenant, login, org, team, source)
    uniqPerSource: unique("itm_unique_per_source").on(
      t.tenantId,
      t.githubLogin,
      t.org,
      t.teamSlug,
      t.source,
    ),

    // Helpful indexes
    byTenantLogin: index("itm_tenant_login_idx").on(t.tenantId, t.githubLogin),
    byTenantTeam: index("itm_tenant_team_idx").on(
      t.tenantId,
      t.org,
      t.teamSlug,
    ),
    byTenantScore: index("itm_tenant_score_idx").on(t.tenantId, t.score),
  }),
);

// Optional: Type helper
export type InferredTeamMembership =
  typeof inferredTeamMemberships.$inferSelect;
export type NewInferredTeamMembership =
  typeof inferredTeamMemberships.$inferInsert;
