CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_token_id" uuid NOT NULL,
	"calendar_id" text NOT NULL,
	"google_event_id" text NOT NULL,
	"recurring_event_id" text,
	"ical_uid" text,
	"sequence" integer,
	"status" text,
	"event_type" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer,
	"original_start_at" timestamp with time zone,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"event_time_zone" text,
	"title_redacted" text,
	"attendees_total" integer DEFAULT 0 NOT NULL,
	"attendees_accepted" integer DEFAULT 0 NOT NULL,
	"attendees_declined" integer DEFAULT 0 NOT NULL,
	"attendees_needs_action" integer DEFAULT 0 NOT NULL,
	"self_response_status" text,
	"is_organizer_self" boolean DEFAULT false NOT NULL,
	"category" text,
	"category_confidence" real,
	"category_source" text,
	"category_version" integer DEFAULT 1 NOT NULL,
	"created_at_google" timestamp with time zone,
	"updated_at_google" timestamp with time zone,
	"last_synced_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_tenant_id_integration_token_id_calendar_id_google_event_id_unique" UNIQUE("tenant_id","integration_token_id","calendar_id","google_event_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ALTER COLUMN "lookback_days" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD COLUMN "window_start_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD COLUMN "window_end_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_sync_runs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;