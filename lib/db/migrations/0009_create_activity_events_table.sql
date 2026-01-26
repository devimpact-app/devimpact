CREATE TYPE "public"."activity_event_source" AS ENUM('github', 'gcal');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source" "activity_event_source" NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"title" text NOT NULL,
	"subtitle" text,
	"url" text,
	"source_entity_table" text NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"repo_full_name" text,
	"pr_number" integer,
	"recurring_event_id" text,
	"metadata" jsonb DEFAULT 'null'::jsonb,
	"derived_version" integer DEFAULT 1 NOT NULL,
	"derived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_events_tenant_id_source_source_entity_table_source_entity_id_event_type_unique" UNIQUE("tenant_id","source","source_entity_table","source_entity_id","event_type")
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_recurring_idx" ON "activity_events" USING btree ("tenant_id","recurring_event_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_tenant_occurred_idx" ON "activity_events" USING btree ("tenant_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_tenant_type_idx" ON "activity_events" USING btree ("tenant_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_repo_idx" ON "activity_events" USING btree ("tenant_id","repo_full_name");