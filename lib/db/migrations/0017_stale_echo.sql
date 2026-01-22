ALTER TABLE "users" ALTER COLUMN "setup_state" SET DEFAULT '{"v":1,"github":{"cliTokenGenerated":false,"cliTokenLinked":false},"bootstrapRecent":{"status":"not_started"},"backfill90d":{"status":"not_started"},"ready":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD COLUMN "token_enc_kid" text DEFAULT 'v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD COLUMN "access_token_enc" text;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD COLUMN "refresh_token_enc" text;