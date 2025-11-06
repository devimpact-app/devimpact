import { Octokit } from "@octokit/rest";
import { GitHubReview } from "./types";

export interface FetchPRReviewsOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
}

export async function fetchPRReviews(
  options: FetchPRReviewsOptions,
): Promise<GitHubReview[]> {
  const { octokit, owner, repo, prNumber } = options;

  try {
    // GitHub may paginate if PR has many reviews
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    const allReviews: GitHubReview[] = [];

    for await (const response of iterator) {
      allReviews.push(...response.data);
    }

    return allReviews;
  } catch (error) {
    console.error(
      `Error fetching reviews for PR ${owner}/${repo}#${prNumber}:`,
      error,
    );
    throw error;
  }
}
