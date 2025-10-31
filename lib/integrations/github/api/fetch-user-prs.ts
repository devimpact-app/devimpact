import { Octokit } from "@octokit/rest";
import { GitHubPullRequest } from "../types";
import { GitHubSearchPullRequest } from "../types/PullRequest";

export interface FetchUserPRsOptions {
  octokit: Octokit;
  username: string;
  since: Date;
  repos: string[];
}

export async function fetchUserPRs(
  options: FetchUserPRsOptions,
): Promise<GitHubSearchPullRequest[]> {
  const { octokit, username, since, repos } = options;

  const allPRs = [];

  // Fetch PRs from each repo
  for (const repoFullName of repos) {
    const [owner, repo] = repoFullName.split("/");

    const q = `is:pr author:${username} repo:${owner}/${repo} created:>=${since.toISOString()}`;

    try {
      // Get all PRs from this repo, then filter by author
      const iterator = octokit.paginate.iterator("GET /search/issues", {
        q,
        sort: "created",
        order: "desc",
        per_page: 100,
        // As GitHub rolls out “advanced search”, this flag is accepted on REST:
        // advanced_search: true,  // (safe to omit; qualifiers already work)
      } as any);

      for await (const response of iterator) {
        allPRs.push(...response.data);
      }
    } catch (error) {
      console.error(`Error fetching PRs from ${repoFullName}:`, error);
      // Continue with other repos even if one fails
    }
  }

  return allPRs;
}
