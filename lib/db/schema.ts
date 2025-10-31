// lib/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
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
