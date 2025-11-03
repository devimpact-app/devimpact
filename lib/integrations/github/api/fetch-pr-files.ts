import { Octokit } from "@octokit/rest";
import { GitHubPRFile } from "./types";

export interface FetchPRFilesOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
}

export async function fetchPRFiles(
  options: FetchPRFilesOptions,
): Promise<GitHubPRFile[]> {
  const { octokit, owner, repo, prNumber } = options;

  try {
    // GitHub may paginate if PR has 100+ files
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    const allFiles: GitHubPRFile[] = [];

    for await (const response of iterator) {
      allFiles.push(...response.data);
    }

    return allFiles;
  } catch (error) {
    console.error(
      `Error fetching files for PR ${owner}/${repo}#${prNumber}:`,
      error,
    );
    throw error;
  }
}
