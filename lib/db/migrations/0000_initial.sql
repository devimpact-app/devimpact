CREATE TYPE "public"."membership_source" AS ENUM('heuristic', 'api');--> statement-breakpoint
CREATE TYPE "public"."team_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."one_on_one_counterpart_type" AS ENUM('manager', 'peer', 'direct_report', 'other');--> statement-breakpoint
CREATE TYPE "public"."one_on_one_status" AS ENUM('ready', 'archived');--> statement-breakpoint
CREATE TABLE "inferred_team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"github_login" text NOT NULL,
	"org" text NOT NULL,
	"team_slug" text NOT NULL,
	"source" "membership_source" DEFAULT 'heuristic' NOT NULL,
	"algo_version" text DEFAULT 'v1' NOT NULL,
	"score" real NOT NULL,
	"confidence" "team_confidence" NOT NULL,
	"evidence_counts" jsonb NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "itm_unique_per_source" UNIQUE("tenant_id","github_login","org","team_slug","source")
);
--> statement-breakpoint
CREATE TABLE "pr_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"repo_full_name" text NOT NULL,
	"pr_number" integer NOT NULL,
	"short_summary" text NOT NULL,
	"long_summary" text,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"type_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"domain_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_friction_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_hash" text,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"pr_updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pr_summaries_pull_request_id_unique" UNIQUE("pull_request_id"),
	CONSTRAINT "pr_summaries_tenant_id_pull_request_id_unique" UNIQUE("tenant_id","pull_request_id")
);
--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_pr_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pr_number" integer NOT NULL,
	"repo_full_name" text NOT NULL,
	"title" text NOT NULL,
	"state" text NOT NULL,
	"pr_author_login" text NOT NULL,
	"html_url" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"author_is_tenant" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"merged_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"first_commit_at" timestamp with time zone,
	"last_ready_for_review_at" timestamp with time zone,
	"first_review_at_for_cycle" timestamp with time zone,
	"authoring_lead_seconds" integer,
	"time_to_first_review_seconds" integer,
	"review_to_merge_seconds" integer,
	"lead_time_seconds" integer,
	"time_to_first_approval_seconds" integer,
	"lines_added" integer DEFAULT 0 NOT NULL,
	"lines_deleted" integer DEFAULT 0 NOT NULL,
	"lines_changed" integer DEFAULT 0 NOT NULL,
	"files_changed" integer DEFAULT 0 NOT NULL,
	"files_added" integer DEFAULT 0 NOT NULL,
	"files_modified" integer DEFAULT 0 NOT NULL,
	"files_deleted" integer DEFAULT 0 NOT NULL,
	"files_renamed" integer DEFAULT 0 NOT NULL,
	"touched_tests" boolean DEFAULT false NOT NULL,
	"test_files_changed" integer DEFAULT 0 NOT NULL,
	"largest_file_changed" integer DEFAULT 0 NOT NULL,
	"avg_changes_per_file" real DEFAULT 0 NOT NULL,
	"commits_count" integer DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"unique_reviewers" integer DEFAULT 0 NOT NULL,
	"self_review_comments_count" integer DEFAULT 0 NOT NULL,
	"review_comments_count" integer DEFAULT 0 NOT NULL,
	"approvals_count" integer DEFAULT 0 NOT NULL,
	"changes_requested_count" integer DEFAULT 0 NOT NULL,
	"blocking_review_count" integer DEFAULT 0 NOT NULL,
	"non_blocking_review_count" integer DEFAULT 0 NOT NULL,
	"review_rounds" integer DEFAULT 0 NOT NULL,
	"was_approved_before_merge" boolean DEFAULT false NOT NULL,
	"had_force_pushes" boolean DEFAULT false NOT NULL,
	"normalized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"normalization_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "pull_requests_github_pr_id_unique" UNIQUE("github_pr_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_review_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pr_id" uuid NOT NULL,
	"pr_number" integer NOT NULL,
	"repo_full_name" text NOT NULL,
	"pr_author_login" text NOT NULL,
	"reviewer_login" text NOT NULL,
	"reviewer_is_tenant" boolean DEFAULT false NOT NULL,
	"state" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"commit_id" text,
	"html_url" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"review_latency" real,
	"review_anchor_at" timestamp with time zone,
	"review_anchor_type" text NOT NULL,
	"anchor_team_slug" text,
	"is_approval" boolean DEFAULT false NOT NULL,
	"is_change_request" boolean DEFAULT false NOT NULL,
	"is_comment_only" boolean DEFAULT false NOT NULL,
	"was_directly_requested" boolean DEFAULT false NOT NULL,
	"was_first_review" boolean DEFAULT false NOT NULL,
	"is_blocking_review" boolean DEFAULT false NOT NULL,
	"is_non_blocking_review" boolean DEFAULT false NOT NULL,
	"review_comments_count" integer DEFAULT 0 NOT NULL,
	"normalized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"normalization_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "reviews_github_review_id_unique" UNIQUE("github_review_id")
);
--> statement-breakpoint
CREATE TABLE "github_pr_commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pr_id" uuid NOT NULL,
	"sha" text NOT NULL,
	"message" text NOT NULL,
	"committed_at" timestamp,
	"author_github_login" text NOT NULL,
	"html_url" text NOT NULL,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "github_pr_commits_pr_id_sha_unique" UNIQUE("pr_id","sha")
);
--> statement-breakpoint
CREATE TABLE "github_pr_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pr_id" uuid NOT NULL,
	"author_github_login" text NOT NULL,
	"filename" text NOT NULL,
	"previous_filename" text,
	"status" text NOT NULL,
	"additions" integer NOT NULL,
	"deletions" integer NOT NULL,
	"changes" integer NOT NULL,
	"file_extension" text NOT NULL,
	"directory" text,
	"is_test_file" boolean DEFAULT false,
	"blob_url" text,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "github_pr_files_pr_id_filename_unique" UNIQUE("pr_id","filename")
);
--> statement-breakpoint
CREATE TABLE "github_prs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"pr_number" integer NOT NULL,
	"repo_full_name" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"state" text NOT NULL,
	"draft" boolean DEFAULT false,
	"author_github_login" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"closed_at" timestamp,
	"html_url" text NOT NULL,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "github_prs_tenant_id_repo_full_name_pr_number_unique" UNIQUE("tenant_id","repo_full_name","pr_number")
);
--> statement-breakpoint
CREATE TABLE "github_raw_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"data_type" text NOT NULL,
	"external_id" text NOT NULL,
	"repo_full_name" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"raw_response" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "github_raw_data_tenant_id_data_type_external_id_unique" UNIQUE("tenant_id","data_type","external_id")
);
--> statement-breakpoint
CREATE TABLE "github_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"is_selected" boolean DEFAULT true NOT NULL,
	"github_repo_id" text NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"is_private" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"primary_language" text,
	"created_at_github" timestamp with time zone,
	"pushed_at_github" timestamp with time zone,
	CONSTRAINT "github_repos_tenant_id_github_repo_id_unique" UNIQUE("tenant_id","github_repo_id")
);
--> statement-breakpoint
CREATE TABLE "github_review_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid NOT NULL,
	"review_id" uuid,
	"tenant_id" uuid NOT NULL,
	"comment_id" text NOT NULL,
	"pull_request_review_id" text,
	"body" text NOT NULL,
	"path" text NOT NULL,
	"line" integer,
	"start_line" integer,
	"side" text,
	"author_github_login" text NOT NULL,
	"author_association" text,
	"in_reply_to_id" text,
	"commit_id" text,
	"diff_hunk" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"html_url" text,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "github_review_comments_comment_id_unique" UNIQUE("comment_id")
);
--> statement-breakpoint
CREATE TABLE "github_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"review_id" text NOT NULL,
	"state" text NOT NULL,
	"body" text,
	"reviewer_github_login" text NOT NULL,
	"pr_author_github_login" text NOT NULL,
	"commit_id" text,
	"author_association" text,
	"submitted_at" timestamp,
	"html_url" text,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "github_reviews_review_id_unique" UNIQUE("review_id")
);
--> statement-breakpoint
CREATE TABLE "github_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" text,
	"event_type" text NOT NULL,
	"actor_github_login" text,
	"event_data" jsonb,
	"requested_target_type" text,
	"requested_reviewer_login" text,
	"requested_team_slug" text,
	"requested_team_org" text,
	"assignee_login" text,
	"label_name" text,
	"created_at" timestamp NOT NULL,
	"url" text,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "github_timeline_events_pr_id_event_id_unique" UNIQUE("pr_id","event_id"),
	CONSTRAINT "github_timeline_events_pr_id_event_type_created_at_actor_github_login_unique" UNIQUE("pr_id","event_type","created_at","actor_github_login")
);
--> statement-breakpoint
CREATE TABLE "integration_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"token_type" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "integration_tokens_user_id_provider_token_type_unique" UNIQUE("user_id","provider","token_type")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"github_username" text NOT NULL,
	"onboarding_state" text DEFAULT 'account_created',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"cli_linked_at" timestamp with time zone,
	"cli_last_sync_at" timestamp with time zone,
	"cli_token_hash" text,
	"coverage_start_date" timestamp with time zone,
	"beta_allowed" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_github_username_unique" UNIQUE("github_username")
);
--> statement-breakpoint
CREATE TABLE "one_on_one_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meeting_at" timestamp with time zone NOT NULL,
	"counterpart_label" text,
	"counterpart_type" "one_on_one_counterpart_type" DEFAULT 'manager' NOT NULL,
	"short_window_weeks" integer DEFAULT 2 NOT NULL,
	"short_window_start" timestamp with time zone NOT NULL,
	"short_window_end" timestamp with time zone NOT NULL,
	"medium_window_start" timestamp with time zone NOT NULL,
	"medium_window_end" timestamp with time zone NOT NULL,
	"status" "one_on_one_status" DEFAULT 'ready' NOT NULL,
	"title" text,
	"payload" jsonb NOT NULL,
	CONSTRAINT "one_on_one_sessions_tenant_id_meeting_at_counterpart_type_unique" UNIQUE("tenant_id","meeting_at","counterpart_type")
);
--> statement-breakpoint
ALTER TABLE "inferred_team_memberships" ADD CONSTRAINT "inferred_team_memberships_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_summaries" ADD CONSTRAINT "pr_summaries_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_summaries" ADD CONSTRAINT "pr_summaries_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_github_pr_id_github_prs_id_fk" FOREIGN KEY ("github_pr_id") REFERENCES "public"."github_prs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_github_review_id_github_reviews_id_fk" FOREIGN KEY ("github_review_id") REFERENCES "public"."github_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_pr_id_pull_requests_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_commits" ADD CONSTRAINT "github_pr_commits_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_commits" ADD CONSTRAINT "github_pr_commits_pr_id_github_prs_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."github_prs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_files" ADD CONSTRAINT "github_pr_files_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_files" ADD CONSTRAINT "github_pr_files_pr_id_github_prs_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."github_prs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_prs" ADD CONSTRAINT "github_prs_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_raw_data" ADD CONSTRAINT "github_raw_data_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_review_comments" ADD CONSTRAINT "github_review_comments_pr_id_github_prs_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."github_prs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_review_comments" ADD CONSTRAINT "github_review_comments_review_id_github_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."github_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_review_comments" ADD CONSTRAINT "github_review_comments_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_reviews" ADD CONSTRAINT "github_reviews_pr_id_github_prs_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."github_prs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_reviews" ADD CONSTRAINT "github_reviews_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_timeline_events" ADD CONSTRAINT "github_timeline_events_pr_id_github_prs_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."github_prs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_timeline_events" ADD CONSTRAINT "github_timeline_events_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "one_on_one_sessions" ADD CONSTRAINT "one_on_one_sessions_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itm_tenant_login_idx" ON "inferred_team_memberships" USING btree ("tenant_id","github_login");--> statement-breakpoint
CREATE INDEX "itm_tenant_team_idx" ON "inferred_team_memberships" USING btree ("tenant_id","org","team_slug");--> statement-breakpoint
CREATE INDEX "itm_tenant_score_idx" ON "inferred_team_memberships" USING btree ("tenant_id","score");--> statement-breakpoint
CREATE INDEX "pr_summaries_tenant_idx" ON "pr_summaries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pull_requests_tenant_idx" ON "pull_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pull_requests_repo_idx" ON "pull_requests" USING btree ("repo_full_name");--> statement-breakpoint
CREATE INDEX "pull_requests_state_idx" ON "pull_requests" USING btree ("state");--> statement-breakpoint
CREATE INDEX "pull_requests_created_at_idx" ON "pull_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pull_requests_merged_at_idx" ON "pull_requests" USING btree ("merged_at");--> statement-breakpoint
CREATE INDEX "reviews_tenant_idx" ON "reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reviews_repo_idx" ON "reviews" USING btree ("tenant_id","repo_full_name");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_idx" ON "reviews" USING btree ("tenant_id","reviewer_login","submitted_at");--> statement-breakpoint
CREATE INDEX "reviews_review_anchor_idx" ON "reviews" USING btree ("tenant_id","reviewer_login","review_anchor_type","submitted_at");--> statement-breakpoint
CREATE INDEX "reviews_pr_idx" ON "reviews" USING btree ("tenant_id","pr_id","submitted_at");--> statement-breakpoint
CREATE INDEX "reviews_state_idx" ON "reviews" USING btree ("tenant_id","state");--> statement-breakpoint
CREATE INDEX "reviews_submitted_at_idx" ON "reviews" USING btree ("tenant_id","submitted_at");--> statement-breakpoint
CREATE INDEX "github_pr_commits_tenant_idx" ON "github_pr_commits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "github_pr_commits_pr_id_idx" ON "github_pr_commits" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "github_pr_files_tenant_idx" ON "github_pr_files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "github_pr_files_pr_id_idx" ON "github_pr_files" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "github_pr_files_extension_idx" ON "github_pr_files" USING btree ("file_extension");--> statement-breakpoint
CREATE INDEX "github_pr_files_test_file_idx" ON "github_pr_files" USING btree ("is_test_file");--> statement-breakpoint
CREATE INDEX "github_prs_tenant_idx" ON "github_prs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "github_prs_repo_idx" ON "github_prs" USING btree ("repo_full_name");--> statement-breakpoint
CREATE INDEX "github_prs_created_at_idx" ON "github_prs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "repos_tenant_idx" ON "github_repos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "github_review_comments_pr_id_idx" ON "github_review_comments" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "github_review_comments_review_id_idx" ON "github_review_comments" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "github_review_comments_tenant_idx" ON "github_review_comments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "github_review_comments_github_login_idx" ON "github_review_comments" USING btree ("author_github_login");--> statement-breakpoint
CREATE INDEX "github_reviews_pr_id_idx" ON "github_reviews" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "github_reviews_tenant_idx" ON "github_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "github_reviews_reviewer_idx" ON "github_reviews" USING btree ("reviewer_github_login");--> statement-breakpoint
CREATE INDEX "github_timeline_events_pr_id_idx" ON "github_timeline_events" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "github_timeline_events_event_type_idx" ON "github_timeline_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "github_timeline_events_github_login_idx" ON "github_timeline_events" USING btree ("actor_github_login");--> statement-breakpoint
CREATE INDEX "github_timeline_events_created_at_idx" ON "github_timeline_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "github_timeline_events_tenant_idx" ON "github_timeline_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "one_on_one_sessions_tenant_idx" ON "one_on_one_sessions" USING btree ("tenant_id");