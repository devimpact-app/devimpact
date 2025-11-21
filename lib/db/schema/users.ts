import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  index,
  boolean,
} from "drizzle-orm/pg-core";

export type Provider = "github";
export type TokenType = "oauth";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  githubUsername: text("github_username").notNull().unique(),
  onboardingState: text("onboarding_state").default("account_created"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  cliLinkedAt: timestamp("cli_linked_at", { withTimezone: true }),
  cliLastSyncAt: timestamp("cli_last_sync_at", { withTimezone: true }),
  cliTokenHash: text("cli_token_hash"),
  // When did our syncs pull from original date
  coverageStartDate: timestamp("coverage_start_date", { withTimezone: true }),
  // Are they an approved user
  betaAllowed: boolean("beta_allowed").default(false),
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
    tokenType: text("token_type").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueUserProviderType: unique().on(
      table.userId,
      table.provider,
      table.tokenType,
    ),
  }),
);

export type IntegrationToken = InferSelectModel<typeof integrationTokens>;
