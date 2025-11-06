import { Octokit } from "@octokit/rest";
import { GitHubPRCommit } from "./types";

export interface FetchPRCommitsOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
}

export async function fetchPRCommits(
  options: FetchPRCommitsOptions,
): Promise<GitHubPRCommit[]> {
  const { octokit, owner, repo, prNumber } = options;

  try {
    // GitHub may paginate if PR has 100+ commits
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.listCommits, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    const allCommits: GitHubPRCommit[] = [];

    for await (const response of iterator) {
      allCommits.push(...response.data);
    }

    return allCommits;
  } catch (error) {
    console.error(
      `Error fetching commits for PR ${owner}/${repo}#${prNumber}:`,
      error,
    );
    throw error;
  }
}
