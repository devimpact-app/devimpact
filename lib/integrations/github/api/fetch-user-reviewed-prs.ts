import { Octokit } from "@octokit/rest";
import { GitHubSearchPullRequest } from "./types/PullRequest";

export interface FetchReviewedPRsOptions {
  octokit: Octokit;
  username: string;
  since: Date;
  repos: string[];
}

/**
 * Fetch PRs that the user has *reviewed* (not authored) in the given repos since the specified date.
 */
export async function fetchReviewedPRs(
  options: FetchReviewedPRsOptions,
): Promise<GitHubSearchPullRequest[]> {
  const { octokit, username, since, repos } = options;
  const allPRs: GitHubSearchPullRequest[] = [];

  for (const repoFullName of repos) {
    const [owner, repo] = repoFullName.split("/");

    // Note: exclude authored PRs with `-author:` qualifier
    const q = `is:pr reviewed-by:${username} -author:${username} repo:${owner}/${repo} updated:>=${since.toISOString()}`;

    try {
      const iterator = octokit.paginate.iterator("GET /search/issues", {
        q,
        sort: "updated",
        order: "desc",
        per_page: 100,
      } as any);

      for await (const response of iterator) {
        // GitHub returns both issues and PRs; keep only PRs
        const prsWithRepo = response.data
          .filter((item) => !!item.pull_request)
          .map((pr) => ({
            ...pr,
            repoFullName: `${owner}/${repo}`,
          }));

        allPRs.push(...prsWithRepo);
      }
    } catch (error) {
      console.error(`Error fetching reviewed PRs from ${repoFullName}:`, error);
      // Skip this repo and continue
    }
  }

  return allPRs;
}
