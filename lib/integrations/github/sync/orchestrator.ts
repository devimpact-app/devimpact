import { db } from "@/lib/db/client";
import { fetchUserPRs } from "../api/fetch-user-prs";
import { fetchReviewedPRs } from "../api/fetch-user-reviewed-prs";
import { GitHubSearchPullRequest } from "../api/types/PullRequest";
import { createGitHubClient } from "../client";
import {
  determineSyncDate,
  getSyncStatus,
  isInitialSync,
  updateSyncStatus,
} from "./sync-status";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hydrateOne } from "./hydrate";
import { PRIngestBundle } from "../ingest/bundle";
import { batchNormalizeUserPRs } from "@/lib/analysis/normalizers/pr-normalizer";
import { persistBundles } from "../ingest/persistBundle";

export async function runSync({
  tenantId,
  githubLogin,
  scope,
}: {
  tenantId: string;
  githubLogin: string;
  scope: "all" | "authored" | "reviewed";
}) {
  const { octokit, username, authType, selectedRepos } =
    await createGitHubClient(tenantId);

  const syncStatus = await getSyncStatus(tenantId);
  const since = determineSyncDate(syncStatus);
  const initialSync = isInitialSync(syncStatus);

  const targets = new Map<string, GitHubSearchPullRequest>();

  // TODO: API calls in future should be in separate public repo

  let authoredPrTargets: GitHubSearchPullRequest[] = [];
  if (scope === "all" || scope === "authored") {
    authoredPrTargets = await fetchUserPRs({
      repos: selectedRepos || [],
      username: githubLogin,
      since,
      octokit,
    });
  }
  let reviewedPrTargets: GitHubSearchPullRequest[] = [];
  if (scope === "all" || scope === "reviewed") {
    reviewedPrTargets = await fetchReviewedPRs({
      repos: selectedRepos || [],
      username: githubLogin,
      since,
      octokit,
    });
  }

  const bundles: PRIngestBundle[] = [];
  for (const pr of authoredPrTargets) {
    const bundle = await hydrateOne({
      pr,
      mode: "authored",
      octokit,
      username,
    });
    if (bundle) bundles.push(bundle);
  }
  for (const pr of reviewedPrTargets) {
    const bundle = await hydrateOne({
      pr,
      mode: "reviewed",
      octokit,
      username,
    });
    if (bundle) bundles.push(bundle);
  }

  // TODO: if bundles coming from CLI, can skip to next part

  const { errors } = await persistBundles(tenantId, bundles);

  const normalizedCount = await batchNormalizeUserPRs(tenantId, username);

  await updateSyncStatus(tenantId);

  await db
    .update(users)
    .set({ onboardingState: "complete" })
    .where(eq(users.id, tenantId));

  return {
    sync_type: initialSync ? "initial" : "incremental",
    auth_type: authType,
    errors,
    username,
    discoveredCount: targets.size,
    normalizedCount,
    date_range: {
      from: since.toISOString(),
      to: new Date().toISOString(),
    },
  };
}
