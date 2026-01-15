ALTER TABLE "pull_requests" ADD COLUMN "tenant_review_requested" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "tenant_review_requested_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "pull_requests_tenant_rev_req_idx" ON "pull_requests" USING btree ("tenant_id","state","tenant_review_requested","tenant_review_requested_at");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_is_tenant_idx" ON "reviews" USING btree ("tenant_id","pr_id","reviewer_is_tenant","submitted_at");