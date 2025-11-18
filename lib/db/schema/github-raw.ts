import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  unique,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";

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

    // Timestamps
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    closedAt: timestamp("closed_at"),

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

export type GithubPR = typeof githubPrs.$inferSelect;

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

export type GithubPRCommit = typeof githubPrCommits.$inferSelect;

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

export type GithubPRFile = typeof githubPrFiles.$inferSelect;

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

export type GithubReview = typeof githubReviews.$inferSelect;

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

export type GithubReviewComment = typeof githubReviewComments.$inferSelect;

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

export type GithubTimelineEvent = typeof githubTimelineEvents.$inferSelect;

export const githubRepos = pgTable(
  "github_repos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isSelected: boolean("is_selected").notNull().default(true),

    githubRepoId: text("github_repo_id").notNull(),
    owner: text("owner").notNull(), // org or username
    name: text("name").notNull(),
    fullName: text("full_name").notNull(), // 'owner/repo'
    isPrivate: boolean("is_private").notNull().default(true),
    isArchived: boolean("is_archived").notNull().default(false),
    visibility: text("visibility").notNull().default("private"),

    defaultBranch: text("default_branch").notNull().default("main"),
    primaryLanguage: text("primary_language"),
    createdAtGitHub: timestamp("created_at_github", {
      withTimezone: true,
    }),
    pushedAtGitHub: timestamp("pushed_at_github", {
      withTimezone: true,
    }),
  },
  (t) => ({
    uniqPerTenant: unique().on(t.tenantId, t.githubRepoId),
    idxTenant: index("repos_tenant_idx").on(t.tenantId),
  }),
);

export type RepositoryCreateInput = InferInsertModel<typeof githubRepos>;

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
