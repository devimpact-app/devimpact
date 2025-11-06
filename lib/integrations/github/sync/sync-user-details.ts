import { createGitHubClient } from "../client";
import {
  determineSyncDate,
  getSyncStatus,
  isInitialSync,
  updateSyncStatus,
} from "./sync-status";
import { syncAuthoredPRs } from "./sync-authored-prs";
import { syncReviewedPRs } from "./sync-reviewed-prs";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function syncUserGitHubData(userId: string) {
  // 1. Setup
  const { octokit, username, authType, selectedRepos } =
    await createGitHubClient(userId);

  // 2. Get sync status
  const syncStatus = await getSyncStatus(userId);
  const since = determineSyncDate(syncStatus);
  const initialSync = isInitialSync(syncStatus);

  // 3. Sync authored PRs
  const authoredResult = await syncAuthoredPRs({
    userId,
    octokit,
    username,
    since,
    repos: selectedRepos ?? [],
  });

  // 4. Sync reviewed PRs
  const reviewedResult = await syncReviewedPRs({
    userId,
    octokit,
    username,
    since,
    repos: selectedRepos ?? [],
  });

  // 5. Update sync status
  await updateSyncStatus(userId, {
    prsCreatedCount: authoredResult.count,
    reviewsGivenCount: reviewedResult.count,
  });

  await db
    .update(users)
    .set({ onboardingState: "complete" })
    .where(eq(users.id, userId));

  return {
    sync_type: initialSync ? "initial" : "incremental",
    auth_type: authType,
    username,
    prs_authored: authoredResult.count,
    prs_reviewed: reviewedResult.count,
    date_range: {
      from: since.toISOString(),
      to: new Date().toISOString(),
    },
  };
}
