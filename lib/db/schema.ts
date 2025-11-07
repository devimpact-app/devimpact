import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
  integer,
  index,
  boolean,
} from "drizzle-orm/pg-core";

export type OnboardingState =
  | "need_data_source" // Haven't chosen GH App or FG PAT
  | "gh_app_pending" // Installed GH App, waiting for org approval
  | "gh_app_approved" // GH App approved, need to select repos
  | "fg_pat_pending" // Created FG PAT, waiting for org approval
  | "fg_pat_approved" // FG PAT approved, need to select repos
  | "syncing" // Selected repos, initial sync in progress
  | "complete";

export type Provider = "github";
export type TokenType = "oauth" | "pat" | "installation";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  githubUsername: text("github_username").notNull().unique(),
  onboardingState: text("onboarding_state").default("need_data_source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = InferSelectModel<typeof users>;

export const integrationTokens = pgTable(
  "integration_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    provider: text("provider").notNull(),
    tokenType: text("token_type").notNull(), // 'oauth' or 'pat' or 'classic_pat'
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    orgLogin: text("org_login"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    coverageStartDate: timestamp("coverage_start_date", { withTimezone: true }), // ← add this
    lastSyncStatus: text("last_sync_status")
      .$type<"ok" | "partial" | "error">()
      .default("ok"),
  },
  (table) => ({
    // Composite unique constraint
    uniqueUserProviderType: unique().on(
      table.userId,
      table.provider,
      table.tokenType,
    ),
  }),
);

export type IntegrationToken = InferSelectModel<typeof integrationTokens>;

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").notNull(), // GitHub's PR ID
    externalNodeId: text("external_node_id").notNull(), // GitHub's PR Node ID
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // tenant=user for now
    provider: text("provider").notNull(), // 'github'
    fullName: text("full_name").notNull(), // 'owner/repo'
    name: text("name").notNull(),
    owner: text("owner").notNull(), // org or username
    isPrivate: boolean("is_private").notNull().default(true),

    // minimal per-repo state you’ll need immediately
    selected: boolean("selected").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncCursor: text("sync_cursor"),
    syncError: text("sync_error"),
  },
  (t) => ({
    uniqPerTenant: unique().on(t.tenantId, t.provider, t.fullName), // start with fullName; upgrade to providerRepoId later
    idxTenant: index("repos_tenant_idx").on(t.tenantId),
  }),
);

export type RepositoryCreateInput = InferInsertModel<typeof repositories>;

export const githubPrs = pgTable(
  "github_prs",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .references(() => users.id)
      .notNull(),

    // PR identification
    externalId: text("external_id").notNull(), // GitHub's PR ID
    externalNodeId: text("external_node_id").notNull(), // GitHub's PR Node ID
    prNumber: integer("pr_number").notNull(),
    repoFullName: text("repo_full_name").notNull(), // "eng-coach/eng-coach"
    repoOwner: text("repo_owner").notNull(), // "eng-coach"
    repoName: text("repo_name").notNull(), // "eng-coach"

    // Basic info
    title: text("title").notNull(),
    body: text("body"),
    state: text("state").notNull(), // "open" or "closed"
    draft: boolean("draft").default(false),

    // Author info
    authorGithubLogin: text("author_github_login").notNull(),

    // Stats (calculated from files/commits)
    additions: integer("additions"),
    deletions: integer("deletions"),
    changedFiles: integer("changed_files"),
    commitsCount: integer("commits_count"),

    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    closedAt: timestamp("closed_at"),
    mergedAt: timestamp("merged_at"),

    // URLs
    htmlUrl: text("html_url").notNull(),

    // Metadata
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    // Unique: user can't have duplicate PRs
    uniquePr: unique().on(table.tenantId, table.repoFullName, table.prNumber),
    // Indexes for queries
    byTenant: index("github_prs_tenant_idx").on(table.tenantId),
    repoIdx: index("github_prs_repo_idx").on(table.repoFullName),
    createdAtIdx: index("github_prs_created_at_idx").on(table.createdAt),
  }),
);

export const githubPrCommits = pgTable(
  "github_pr_commits",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .references(() => users.id)
      .notNull(),
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),

    // Commit identification
    sha: text("sha").notNull(),

    // Commit info
    message: text("message").notNull(),
    committedAt: timestamp("committed_at"),

    // GitHub user (if commit author has GitHub account)
    authorGithubLogin: text("author_github_login").notNull(),

    // URLs
    htmlUrl: text("html_url").notNull(),

    // Metadata
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    // Unique: one commit per PR
    uniqueCommit: unique().on(table.prId, table.sha),
    // Index for queries
    byTenant: index("github_pr_commits_tenant_idx").on(table.tenantId),
    prIdIdx: index("github_pr_commits_pr_id_idx").on(table.prId),
  }),
);

export const githubPrFiles = pgTable(
  "github_pr_files",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .references(() => users.id)
      .notNull(),
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),
    authorGithubLogin: text("author_github_login").notNull(),

    // File identification
    filename: text("filename").notNull(), // "src/components/Button.tsx"
    previousFilename: text("previous_filename"), // If renamed
    status: text("status").notNull(), // "added", "modified", "deleted", "renamed"

    // Stats
    additions: integer("additions").notNull(),
    deletions: integer("deletions").notNull(),
    changes: integer("changes").notNull(),

    // Derived fields for analytics
    fileExtension: text("file_extension"), // ".tsx"
    directory: text("directory"), // "src/components"
    isTestFile: boolean("is_test_file").default(false),

    // URLs
    blobUrl: text("blob_url"),

    // Metadata
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    // Index for queries
    byTenant: index("github_pr_files_tenant_idx").on(table.tenantId),
    prIdIdx: index("github_pr_files_pr_id_idx").on(table.prId),
    extensionIdx: index("github_pr_files_extension_idx").on(
      table.fileExtension,
    ),
    testFileIdx: index("github_pr_files_test_file_idx").on(table.isTestFile),
    uniquePrFile: unique().on(table.prId, table.filename),
  }),
);

export const githubReviews = pgTable(
  "github_reviews",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),
    tenantId: uuid("tenant_id")
      .references(() => users.id)
      .notNull(),

    // GitHub's review ID (used to link review comments)
    reviewId: text("review_id").notNull(), // ✅ This is what review_comments references

    // Review content
    state: text("state").notNull(), // "APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"
    body: text("body"), // Overall review comment (optional)

    // Reviewer info
    reviewerGithubLogin: text("reviewer_github_login").notNull(),

    // Context
    commitId: text("commit_id"), // Which commit was reviewed
    authorAssociation: text("author_association"), // MEMBER, CONTRIBUTOR, etc.

    // Timestamps
    submittedAt: timestamp("submitted_at"),

    // URLs
    htmlUrl: text("html_url"),

    // Metadata
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    // Unique: one review record per GitHub review
    uniqueReview: unique().on(table.reviewId),
    // Indexes for queries
    prIdIdx: index("github_reviews_pr_id_idx").on(table.prId),
    byTenant: index("github_reviews_tenant_idx").on(table.tenantId),
    reviewerIdx: index("github_reviews_reviewer_idx").on(
      table.reviewerGithubLogin,
    ),
  }),
);

export const githubReviewComments = pgTable(
  "github_review_comments",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),

    // Relationships
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),
    reviewId: uuid("review_id").references(() => githubReviews.id), // Nullable (standalone comments)
    tenantId: uuid("tenant_id")
      .references(() => users.id)
      .notNull(), // Whose data this is

    // GitHub IDs
    commentId: text("comment_id").notNull(), // GitHub's comment ID
    pullRequestReviewId: text("pull_request_review_id"), // GitHub's review ID (for linkage)

    // Comment content
    body: text("body").notNull(),

    // File location
    path: text("path").notNull(), // "src/components/Button.tsx"
    line: integer("line"),
    startLine: integer("start_line"),
    side: text("side"), // "LEFT" or "RIGHT"

    // Author
    authorGithubLogin: text("author_github_login").notNull(), // ✅ Standardized
    authorAssociation: text("author_association"),

    // Threading
    inReplyToId: text("in_reply_to_id"), // If replying to another comment

    // Context
    commitId: text("commit_id"),
    diffHunk: text("diff_hunk"), // Code snippet (can be large, consider skipping)

    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),

    // URLs
    htmlUrl: text("html_url"),

    // Metadata
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    // Unique: one record per GitHub comment
    uniqueComment: unique().on(table.commentId),
    // Indexes
    prIdIdx: index("github_review_comments_pr_id_idx").on(table.prId),
    reviewIdIdx: index("github_review_comments_review_id_idx").on(
      table.reviewId,
    ),
    byTenant: index("github_review_comments_tenant_idx").on(table.tenantId),
    githubLoginIdx: index("github_review_comments_github_login_idx").on(
      table.authorGithubLogin,
    ),
  }),
);

export const githubTimelineEvents = pgTable(
  "github_timeline_events",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),

    // Relationships
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),
    tenantId: uuid("tenant_id")
      .references(() => users.id)
      .notNull(),

    // GitHub ID
    eventId: text("event_id"), // GitHub's event ID (nullable - some events don't have it)

    // Event info
    eventType: text("event_type").notNull(), // "review_requested", "merged", etc.

    // Actor (who triggered the event)
    actorGithubLogin: text("actor_github_login"), // Can be null for some automated events

    // Event-specific data (JSONB for flexibility)
    eventData: jsonb("event_data"), // Store full event details here

    // Common extracted fields (for easier querying)
    requestedTargetType: text("requested_target_type"), // "user" | "team" (null for other event types)
    requestedReviewerLogin: text("requested_reviewer_login"), // user target
    requestedTeamSlug: text("requested_team_slug"), // team target
    requestedTeamOrg: text("requested_team_org"),
    assigneeLogin: text("assignee_login"), // For assigned
    labelName: text("label_name"), // For labeled/unlabeled

    // Timestamps
    createdAt: timestamp("created_at").notNull(),

    // URLs
    url: text("url"),

    // Metadata
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    // Indexes for common queries
    prIdIdx: index("github_timeline_events_pr_id_idx").on(table.prId),
    eventTypeIdx: index("github_timeline_events_event_type_idx").on(
      table.eventType,
    ),
    githubLoginIdx: index("github_timeline_events_github_login_idx").on(
      table.actorGithubLogin,
    ),
    createdAtIdx: index("github_timeline_events_created_at_idx").on(
      table.createdAt,
    ),
    byTenant: index("github_timeline_events_tenant_idx").on(table.tenantId),

    uniqueEventId: unique().on(table.prId, table.eventId),

    // For events without an eventId (fallback):
    // Use eventType + createdAt + githubLogin as a near-unique fingerprint.
    uniqueFallback: unique().on(
      table.prId,
      table.eventType,
      table.createdAt,
      table.actorGithubLogin,
    ),
  }),
);

// Raw responses
export const githubRawData = pgTable(
  "github_raw_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .references(() => users.id)
      .notNull(),
    dataType: text("data_type").notNull(), // 'pr', 'review'
    externalId: text("external_id").notNull(),
    repoFullName: text("repo_full_name").notNull(), // "eng-coach/eng-coach"
    repoOwner: text("repo_owner").notNull(), // "eng-coach"
    repoName: text("repo_name").notNull(),
    rawResponse: jsonb("raw_response").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    uniqueRawData: unique().on(
      table.tenantId,
      table.dataType,
      table.externalId,
    ),
  }),
);
