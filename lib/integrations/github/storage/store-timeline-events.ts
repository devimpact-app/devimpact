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
      events.map((e) => {
        // Extract common fields based on event type
        let requestedReviewerLogin = null;
        let assigneeLogin = null;
        let labelName = null;

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
        }

        return {
          prId,
          userId, // ✅ Keep user UUID
          eventId: e.id || null, // Some events don't have IDs
          eventType: e.event || "unknown",
          githubLogin: e.actor?.login || null,
          eventData: e, // Store full event for flexibility
          requestedReviewerLogin,
          assigneeLogin,
          labelName,
          createdAt: e.created_at ? new Date(e.created_at) : new Date(),
          url: e.url || null,
        };
      }),
    )
    .onConflictDoNothing(); // Events are immutable, don't update
}
