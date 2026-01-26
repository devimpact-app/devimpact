CREATE TYPE "public"."threading_state" AS ENUM('unprocessed', 'in_progress', 'threaded', 'deferred', 'final_skipped');--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_state" "threading_state" DEFAULT 'unprocessed' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_deferred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_last_decision" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_last_decision_reason" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_claimed_by" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "threading_claim_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "activity_events_threading_queue_idx" ON "activity_events" USING btree ("tenant_id","threading_state","occurred_at","id");