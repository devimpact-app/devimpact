ALTER TABLE "users" ADD COLUMN "weekly_summary_email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text;