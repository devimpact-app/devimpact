CREATE TYPE "public"."thread_category" AS ENUM('features', 'bugs_incidents', 'tech_debt', 'collaboration', 'alignment', 'skill_growth', 'hiring');--> statement-breakpoint
CREATE TYPE "public"."thread_event_assigned_by" AS ENUM('llm', 'user', 'heuristic');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "thread_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"activity_event_id" uuid NOT NULL,
	"assigned_by" "thread_event_assigned_by" NOT NULL,
	"assignment_confidence" real,
	"assignment_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_events_uniq_event" UNIQUE("tenant_id","activity_event_id")
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_key" "thread_category" NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"status" "thread_status" DEFAULT 'active' NOT NULL,
	"confidence" real,
	"first_activity_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"user_edited_at" timestamp with time zone,
	"last_update" jsonb DEFAULT 'null'::jsonb,
	"model" text,
	"prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "thread_events" ADD CONSTRAINT "thread_events_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_events" ADD CONSTRAINT "thread_events_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_events" ADD CONSTRAINT "thread_events_activity_event_id_activity_events_id_fk" FOREIGN KEY ("activity_event_id") REFERENCES "public"."activity_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "thread_events_thread_idx" ON "thread_events" USING btree ("tenant_id","thread_id");--> statement-breakpoint
CREATE INDEX "thread_events_event_idx" ON "thread_events" USING btree ("tenant_id","activity_event_id");--> statement-breakpoint
CREATE INDEX "threads_tenant_idx" ON "threads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "threads_tenant_status_last_idx" ON "threads" USING btree ("tenant_id","status","last_activity_at");--> statement-breakpoint
CREATE INDEX "threads_tenant_cat_status_last_idx" ON "threads" USING btree ("tenant_id","category_key","status","last_activity_at");--> statement-breakpoint
CREATE INDEX "threads_tenant_last_idx" ON "threads" USING btree ("tenant_id","last_activity_at");