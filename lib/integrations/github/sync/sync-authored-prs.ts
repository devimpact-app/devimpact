import { Octokit } from "@octokit/rest";
import { fetchUserPRs } from "../api/fetch-user-prs";
import { syncPRDetails } from "./sync-pr-details";

export interface SyncAuthoredPRsOptions {
  userId: string;
  octokit: Octokit;
  username: string;
  since: Date;
  repos: string[];
}

export async function syncAuthoredPRs(options: SyncAuthoredPRsOptions) {
  const { userId, octokit, username, since, repos } = options;

  // 1. Fetch PRs list
  const prs = await fetchUserPRs({ octokit, username, since, repos });

  // 2. Enrich each PR with details
  for (const pr of prs) {
    const [owner, repo] = pr.repoFullName.split("/");

    await syncPRDetails({
      userId,
      octokit,
      owner,
      repo,
      prNumber: pr.number,
      mode: "authored",
      pr, // Pass basic PR data
      username,
    });
  }

  return {
    count: prs.length,
    prs: prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
    })),
  };
}
