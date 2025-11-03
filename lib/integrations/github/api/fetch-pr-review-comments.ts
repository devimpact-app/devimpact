// lib/integrations/github/api/fetch-pr-review-comments.ts
import { Octokit } from "@octokit/rest";
import { GitHubReviewComment } from "./types";

export interface FetchPRReviewCommentsOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
}

export async function fetchPRReviewComments(
  options: FetchPRReviewCommentsOptions,
): Promise<GitHubReviewComment[]> {
  const { octokit, owner, repo, prNumber } = options;

  try {
    const iterator = octokit.paginate.iterator(
      octokit.rest.pulls.listReviewComments,
      {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      },
    );

    const allComments: GitHubReviewComment[] = [];

    for await (const response of iterator) {
      allComments.push(...response.data);
    }

    return allComments;
  } catch (error) {
    console.error(
      `Error fetching review comments for PR ${owner}/${repo}#${prNumber}:`,
      error,
    );
    throw error;
  }
}
