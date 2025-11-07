import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  index,
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
