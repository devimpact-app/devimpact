import { db } from "@/lib/db/client";
import { githubTimelineEvents } from "@/lib/db/schema";
import { GitHubTimelineEvent } from "../api/types";

export async function storeTimelineEvents(
  prId: string,
  userId: string,
  events: GitHubTimelineEvent[],
): Promise<void> {
  if (!events?.length) return;

  await db
    .insert(githubTimelineEvents)
    .values(
      events
        // Skip noisy types you don't want to persist
        .filter((e) => e.event !== "committed" && e.event !== "deployed")
        .map((e) => {
          // —— Defaults
          let requestedTargetType: "user" | "team" | null = null;
          let requestedReviewerLogin: string | null = null;
          let requestedTeamSlug: string | null = null;
          let requestedTeamOrg: string | null = null;
          let assigneeLogin: string | null = null;
          let labelName: string | null = null;

          // Prefer submitted_at for reviewed; otherwise fall back to created_at
          const dateStr =
            (e.event === "reviewed" ? (e as any).submitted_at : null) ??
            (e as any).created_at ??
            null;

          // Actor: GitHub timeline payloads sometimes use actor or user
          const actor =
            (e as any).actor?.login ?? (e as any).user?.login ?? null;

          // URL normalization
          const url = (e as any).url ?? (e as any).html_url ?? null;

          // ---- Event-specific normalization
          if (
            e.event === "review_requested" ||
            e.event === "review_request_removed"
          ) {
            // Individual request
            const rr = (e as any).requested_reviewer;
            if (rr?.login) {
              requestedTargetType = "user";
              requestedReviewerLogin = rr.login;
            }

            // Team request
            const rt = (e as any).requested_team;
            if (rt?.slug) {
              requestedTargetType = "team";
              requestedTeamSlug = rt.slug;
              requestedTeamOrg = rt.organization?.login ?? null;
              // Ensure we don't also set requestedReviewerLogin for team case
              if (requestedTargetType === "team") requestedReviewerLogin = null;
            }
          } else if (e.event === "assigned" && (e as any).assignee) {
            assigneeLogin = (e as any).assignee.login ?? null;
          } else if (
            (e.event === "labeled" || e.event === "unlabeled") &&
            (e as any).label
          ) {
            labelName = (e as any).label.name ?? null;
          }

          return {
            prId,
            tenantId: userId,

            // GitHub's event id (may be absent for some)
            eventId: (e as any).id ? String((e as any).id) : null,

            eventType: e.event ?? "unknown",
            actorGithubLogin: actor,

            // NEW normalized targets for review requests
            requestedTargetType,
            requestedReviewerLogin,
            requestedTeamSlug,
            requestedTeamOrg,

            // Keep raw for flexibility
            eventData: e as unknown as object,

            assigneeLogin,
            labelName,

            createdAt: dateStr ? new Date(dateStr) : new Date(),
            url,
          };
        }),
    )
    // Events are append-only; rely on your unique constraints
    // unique(prId, eventId) or fallback composite unique
    .onConflictDoNothing();
}
