CREATE TYPE "public"."job_kind" AS ENUM('setup_bootstrap_recent', 'setup_backfill_90d', 'threading_recent', 'weekly_summary_latest');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" "job_kind" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"dedupe_key" text NOT NULL,
	"lock_expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"parent_job_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "setup_state" jsonb DEFAULT '{"v":1,"github":{"cliTokenGenerated":false,"cliTokenLinked":false},"bootstrapRecent":{"status":"not_started"},"backfill90d":{"status":"not_started"},"ready":false,"updatedAt":"2026-01-21T23:22:43.304Z"}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "jobs_tenant_kind_status_idx" ON "jobs" USING btree ("tenant_id","kind","status");--> statement-breakpoint
CREATE INDEX "jobs_status_runat_priority_idx" ON "jobs" USING btree ("status","next_run_at","priority");--> statement-breakpoint
CREATE INDEX "jobs_parent_idx" ON "jobs" USING btree ("parent_job_id");
CREATE UNIQUE INDEX IF NOT EXISTS jobs_singleton_active ON jobs (tenant_id, kind, dedupe_key) WHERE status IN ('queued','running');