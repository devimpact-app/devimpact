CREATE TYPE "public"."weekly_summary_status" AS ENUM('pending', 'generating', 'ready', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "weekly_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"week_start_local_date" text NOT NULL,
	"timezone" text NOT NULL,
	"range_start_utc" timestamp with time zone NOT NULL,
	"range_end_utc" timestamp with time zone NOT NULL,
	"status" "weekly_summary_status" DEFAULT 'pending' NOT NULL,
	"generation_started_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"claimed_by" text,
	"claim_expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"emailed_at" timestamp with time zone,
	"output" jsonb DEFAULT 'null'::jsonb,
	"referenced_thread_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"referenced_event_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text,
	"prompt_version" text,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_summaries_uniq_tenant_week" UNIQUE("tenant_id","week_start_local_date","timezone")
);
--> statement-breakpoint
ALTER TABLE "weekly_summaries" ADD CONSTRAINT "weekly_summaries_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weekly_summaries_tenant_week_idx" ON "weekly_summaries" USING btree ("tenant_id","week_start_local_date");--> statement-breakpoint
CREATE INDEX "weekly_summaries_tenant_status_idx" ON "weekly_summaries" USING btree ("tenant_id","status","week_start_local_date");--> statement-breakpoint
CREATE INDEX "weekly_summaries_tenant_emailed_idx" ON "weekly_summaries" USING btree ("tenant_id","emailed_at");--> statement-breakpoint
CREATE INDEX "weekly_summaries_tenant_range_idx" ON "weekly_summaries" USING btree ("tenant_id","range_start_utc","range_end_utc");