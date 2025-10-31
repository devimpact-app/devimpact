import { Octokit } from "@octokit/rest";
import { GitHubPullRequest } from "../types";

export interface FetchUserPRsOptions {
  token: string;
  username: string;
  since: Date;
  repos: string[];
}

export async function fetchUserPRs(
  options: FetchUserPRsOptions,
): Promise<GitHubPullRequest[]> {
  const { token, username, since, repos } = options;

  const octokit = new Octokit({ auth: token });

  const allPRs = [];

  // Fetch PRs from each repo
  for (const repoFullName of repos) {
    const [owner, repo] = repoFullName.split("/");

    try {
      // Get all PRs from this repo, then filter by author
      const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
        owner,
        repo,
        state: "all", // Get open, closed, and merged
        sort: "created",
        direction: "desc",
        per_page: 100,
      });

      for await (const response of iterator) {
        // Filter by author and date
        const userPRs = response.data.filter((pr) => {
          const createdAt = new Date(pr.created_at);
          return pr.user?.login === username && createdAt >= since;
        });

        allPRs.push(...userPRs);
      }
    } catch (error) {
      console.error(`Error fetching PRs from ${repoFullName}:`, error);
      // Continue with other repos even if one fails
    }
  }

  return allPRs;
}
