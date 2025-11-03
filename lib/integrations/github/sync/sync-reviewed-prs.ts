import { Octokit } from "@octokit/rest";
import { syncPRDetails } from "./sync-pr-details";
import { fetchReviewedPRs } from "../api/fetch-user-reviewed-prs";

export interface SyncReviewedPRsOptions {
  userId: string;
  octokit: Octokit;
  username: string;
  since: Date;
  repos: string[];
}

export async function syncReviewedPRs(options: SyncReviewedPRsOptions) {
  const { userId, octokit, username, since, repos } = options;

  // 1. Fetch PRs list
  const prs = await fetchReviewedPRs({ octokit, username, since, repos });

  // 2. Enrich each PR with details
  for (const pr of prs) {
    const [owner, repo] = pr.repoFullName.split("/");

    await syncPRDetails({
      userId,
      octokit,
      owner,
      repo,
      prNumber: pr.number,
      mode: "reviewed",
      username,
      pr, // Pass basic PR data
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
