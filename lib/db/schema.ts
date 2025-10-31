import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
  integer,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
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
    tokenType: text("token_type").notNull(), // 'oauth' or 'pat'
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    classicPat: text("classic_pat"), // Add this
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
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    prNumber: integer("pr_number").notNull(),
    repo: text("repo").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    state: text("state").notNull(), // open, closed, merged
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    mergedAt: timestamp("merged_at"),
    closedAt: timestamp("closed_at"),
    author: text("author").notNull(),
    commitsCount: integer("commits_count"), // Number of commits in PR
    additions: integer("additions"),
    deletions: integer("deletions"),
    changedFiles: integer("changed_files"),
    htmlUrl: text("html_url").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    uniquePr: unique().on(table.userId, table.repo, table.prNumber),
  }),
);

export const githubPrCommits = pgTable(
  "github_pr_commits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prId: uuid("pr_id")
      .references(() => githubPrs.id)
      .notNull(),
    sha: text("sha").notNull(),
    message: text("message").notNull(),
    author: text("author").notNull(),
    createdAt: timestamp("created_at").notNull(),
    additions: integer("additions"),
    deletions: integer("deletions"),
    htmlUrl: text("html_url"),
  },
  (table) => ({
    uniqueCommit: unique().on(table.prId, table.sha),
  }),
);

export const githubPrFiles = pgTable("github_pr_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  prId: uuid("pr_id")
    .references(() => githubPrs.id)
    .notNull(),
  filename: text("filename").notNull(),
  status: text("status").notNull(), // added, modified, removed
  additions: integer("additions").notNull(),
  deletions: integer("deletions").notNull(),
  changes: integer("changes").notNull(),
});

export const githubReviews = pgTable(
  "github_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    prId: uuid("pr_id").references(() => githubPrs.id),
    reviewId: integer("review_id").notNull(),
    repo: text("repo").notNull(),
    prNumber: integer("pr_number").notNull(),
    prTitle: text("pr_title"),
    prAuthor: text("pr_author"),
    state: text("state").notNull(), // APPROVED, CHANGES_REQUESTED, COMMENTED
    body: text("body"),
    submittedAt: timestamp("submitted_at").notNull(),
    htmlUrl: text("html_url"),
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => ({
    uniqueReview: unique().on(table.userId, table.reviewId),
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
    repo: text("repo"),
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
