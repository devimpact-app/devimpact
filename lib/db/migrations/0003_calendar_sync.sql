CREATE TYPE "public"."calendar_sync_mode" AS ENUM('initial', 'manual', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."calendar_sync_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "calendar_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_token_id" uuid NOT NULL,
	"is_selected" boolean DEFAULT false NOT NULL,
	"calendar_id" text NOT NULL,
	"summary" text NOT NULL,
	"time_zone" text,
	"access_role" text,
	"is_primary" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_selections_tenant_id_integration_token_id_calendar_id_unique" UNIQUE("tenant_id","integration_token_id","calendar_id")
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_token_id" uuid NOT NULL,
	"status" "calendar_sync_status" DEFAULT 'pending' NOT NULL,
	"mode" "calendar_sync_mode" NOT NULL,
	"lookback_days" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"calendars_synced_count" integer DEFAULT 0,
	"events_upserted_count" integer DEFAULT 0,
	"next_sync_after" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "calendar_selections" ADD CONSTRAINT "calendar_selections_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_selections" ADD CONSTRAINT "calendar_selections_integration_token_id_integration_tokens_id_fk" FOREIGN KEY ("integration_token_id") REFERENCES "public"."integration_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD CONSTRAINT "calendar_sync_runs_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD CONSTRAINT "calendar_sync_runs_integration_token_id_integration_tokens_id_fk" FOREIGN KEY ("integration_token_id") REFERENCES "public"."integration_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_selections_tenant_idx" ON "calendar_selections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "calendar_sync_runs_recent_idx" ON "calendar_sync_runs" USING btree ("tenant_id","started_at");