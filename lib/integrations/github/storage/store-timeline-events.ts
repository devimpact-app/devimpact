import { db } from "@/lib/db/client";
import { githubTimelineEvents } from "@/lib/db/schema";
import { GitHubTimelineEvent } from "../api/types";

export async function storeTimelineEvents(
  prId: string,
  userId: string,
  events: GitHubTimelineEvent[],
): Promise<void> {
  if (events.length === 0) return;

  await db
    .insert(githubTimelineEvents)
    .values(
      events
        .filter((e) => e.event !== "committed" && e.event !== "deployed")
        .map((e) => {
          // Extract common fields based on event type
          let requestedReviewerLogin = null;
          let assigneeLogin = null;
          let labelName = null;
          let dateToUse: string | null = e.created_at || null;

          if (e.event === "review_requested" && e.requested_reviewer) {
            requestedReviewerLogin = e.requested_reviewer.login;
          } else if (
            e.event === "review_request_removed" &&
            e.requested_reviewer
          ) {
            requestedReviewerLogin = e.requested_reviewer.login;
          } else if (e.event === "assigned" && (e as any).assignee) {
            assigneeLogin = (e as any).assignee.login;
          } else if (
            (e.event === "labeled" || e.event === "unlabeled") &&
            (e as any).label
          ) {
            labelName = (e as any).label.name;
          } else if (e.event === "reviewed") {
            dateToUse = e.submitted_at || e.created_at || null;
          }

          return {
            prId,
            userId,
            eventId: e.id ? String(e.id) : null, // Some events don't have IDs
            eventType: e.event || "unknown",
            githubLogin: e.actor?.login || e.user?.login || null,
            eventData: e, // Store full event for flexibility
            requestedReviewerLogin,
            assigneeLogin,
            labelName,
            createdAt: dateToUse ? new Date(dateToUse) : new Date(),
            url: e.url || e.html_url || null,
          };
        }),
    )
    .onConflictDoNothing(); // Events are immutable, don't update
}
