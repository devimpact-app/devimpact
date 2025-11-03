// lib/integrations/github/api/fetch-pr-timeline.ts
import { Octokit } from "@octokit/rest";
import { GitHubTimelineEvent } from "./types";

export interface FetchPRTimelineOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
}

export async function fetchPRTimeline(
  options: FetchPRTimelineOptions,
): Promise<GitHubTimelineEvent[]> {
  const { octokit, owner, repo, prNumber } = options;

  try {
    // GitHub may paginate if PR has many timeline events
    const iterator = octokit.paginate.iterator(
      octokit.rest.issues.listEventsForTimeline,
      {
        owner,
        repo,
        issue_number: prNumber, // PRs are issues in the API
        per_page: 100,
      },
    );

    const allEvents: GitHubTimelineEvent[] = [];

    for await (const response of iterator) {
      allEvents.push(...response.data);
    }

    return allEvents;
  } catch (error) {
    console.error(
      `Error fetching timeline for PR ${owner}/${repo}#${prNumber}:`,
      error,
    );
    throw error;
  }
}
