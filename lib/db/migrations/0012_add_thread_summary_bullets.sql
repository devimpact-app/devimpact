CREATE TYPE "public"."thread_bullet_source" AS ENUM('llm', 'user');--> statement-breakpoint
CREATE TABLE "thread_summary_bullets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"sort_index" integer NOT NULL,
	"text" text NOT NULL,
	"source" "thread_bullet_source" DEFAULT 'llm' NOT NULL,
	"user_edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"referenced_event_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone,
	"model" text,
	"prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "title_user_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "summary_headline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "headline_user_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "summary_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "summary_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "thread_summary_bullets" ADD CONSTRAINT "thread_summary_bullets_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_summary_bullets" ADD CONSTRAINT "thread_summary_bullets_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "thread_summary_bullets_tenant_thread_idx" ON "thread_summary_bullets" USING btree ("tenant_id","thread_id","sort_index");