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

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  githubUsername: text("github_username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const integrationTokens = pgTable(
  "integration_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    provider: text("provider").notNull(),
    tokenType: text("token_type").notNull(), // 'oauth' or 'pat' or 'installation
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    installationId: text("installation_id"), // required for kind='installation'
    orgLogin: text("org_login"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
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

export const githubPrs = pgTable(
  "github_prs",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),

    // PR identification
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
    githubLogin: text("github_login").notNull(),

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
    uniquePr: unique().on(table.userId, table.repoFullName, table.prNumber),
    // Indexes for queries
    userIdIdx: index("github_prs_user_id_idx").on(table.userId),
    repoIdx: index("github_prs_repo_idx").on(table.repoFullName),
    createdAtIdx: index("github_prs_created_at_idx").on(table.createdAt),
  }),
);

export const githubPrCommits = pgTable(
  "github_pr_commits",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),

    // Commit identification
    sha: text("sha").notNull(),

    // Commit info
    message: text("message").notNull(),
    committedAt: timestamp("committed_at"),

    // GitHub user (if commit author has GitHub account)
    githubLogin: text("github_login").notNull(),

    // URLs
    htmlUrl: text("html_url").notNull(),

    // Metadata
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    // Unique: one commit per PR
    uniqueCommit: unique().on(table.prId, table.sha),
    // Index for queries
    prIdIdx: index("github_pr_commits_pr_id_idx").on(table.prId),
  }),
);

export const githubPrFiles = pgTable(
  "github_pr_files",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),
    githubLogin: text("github_login").notNull(),

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
    prIdIdx: index("github_pr_files_pr_id_idx").on(table.prId),
    extensionIdx: index("github_pr_files_extension_idx").on(
      table.fileExtension,
    ),
    testFileIdx: index("github_pr_files_test_file_idx").on(table.isTestFile),
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
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),

    // GitHub's review ID (used to link review comments)
    reviewId: text("review_id").notNull(), // ✅ This is what review_comments references

    // Review content
    state: text("state").notNull(), // "APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"
    body: text("body"), // Overall review comment (optional)

    // Reviewer info
    githubLogin: text("github_login").notNull(),

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
    userIdIdx: index("github_reviews_user_id_idx").on(table.userId),
    reviewerIdx: index("github_reviews_reviewer_idx").on(table.githubLogin),
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
    userId: uuid("user_id")
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
    githubLogin: text("github_login").notNull(), // ✅ Standardized
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
    userIdIdx: index("github_review_comments_user_id_idx").on(table.userId),
    githubLoginIdx: index("github_review_comments_github_login_idx").on(
      table.githubLogin,
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
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),

    // GitHub ID
    eventId: text("event_id"), // GitHub's event ID (nullable - some events don't have it)

    // Event info
    eventType: text("event_type").notNull(), // "review_requested", "merged", etc.

    // Actor (who triggered the event)
    githubLogin: text("github_login"), // Can be null for some automated events

    // Event-specific data (JSONB for flexibility)
    eventData: jsonb("event_data"), // Store full event details here

    // Common extracted fields (for easier querying)
    requestedReviewerLogin: text("requested_reviewer_login"), // For review_requested
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
      table.githubLogin,
    ),
    createdAtIdx: index("github_timeline_events_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

// Raw responses
export const githubRawData = pgTable(
  "github_raw_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
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
    uniqueRawData: unique().on(table.userId, table.dataType, table.externalId),
  }),
);

export const githubSyncStatus = pgTable("github_sync_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  lastSyncedAt: timestamp("last_synced_at"),
  coverageStartDate: timestamp("coverage_start_date"),
  prsCreatedCount: integer("prs_created_count").default(0),
  reviewsGivenCount: integer("reviews_given_count").default(0),
});

export const githubPendingRequests = pgTable("github_pending_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),

  githubUsername: text("github_username").notNull(),

  // track lifecycle
  status: text("status").default("waiting"), // waiting, installed, rejected, etc

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
