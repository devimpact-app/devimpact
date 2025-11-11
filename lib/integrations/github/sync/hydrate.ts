import { Octokit } from "@octokit/rest";
import { fetchPRFiles } from "../api/fetch-pr-files";
import { fetchPRCommits } from "../api/fetch-pr-commits";
import { fetchPRReviews } from "../api/fetch-pr-reviews";
import { fetchPRReviewComments } from "../api/fetch-pr-review-comments";
import { fetchPRTimeline } from "../api/fetch-pr-timeline";
import { GitHubSearchPullRequest } from "../api/types/PullRequest";
import { PRIngestBundle } from "./persist-bundle";

export interface HydrateOptions {
  pr: GitHubSearchPullRequest;
  mode: "authored" | "reviewed";
  octokit: Octokit;
  username: string;
}

export async function hydrateOne({
  pr,
  mode,
  octokit,
  username,
}: HydrateOptions): Promise<PRIngestBundle | null> {
  const repoFullName = pr.repoFullName;
  const prNumber = pr.number;
  const [owner, repo] = repoFullName.split("/");
  try {
    if (mode === "authored") {
      // AUTHORED: Fetch everything
      const [files, commits, reviews, reviewComments, timeline] =
        await Promise.all([
          fetchPRFiles({ octokit, owner, repo, prNumber }),
          fetchPRCommits({ octokit, owner, repo, prNumber }),
          fetchPRReviews({ octokit, owner, repo, prNumber }),
          fetchPRReviewComments({ octokit, owner, repo, prNumber }),
          fetchPRTimeline({ octokit, owner, repo, prNumber }),
        ]);

      return {
        repo: { fullName: repoFullName, owner, name: repo },
        pr,
        files,
        commits,
        reviews: reviews,
        reviewComments: reviewComments,
        timeline,
      };
    } else {
      // REVIEWED: Only fetch review activity
      const [allReviews, reviewComments, timeline] = await Promise.all([
        fetchPRReviews({ octokit, owner, repo, prNumber }),
        fetchPRReviewComments({ octokit, owner, repo, prNumber }),
        fetchPRTimeline({ octokit, owner, repo, prNumber }),
      ]);

      // Filter for user's reviews only
      const userReviews = allReviews.filter((r) => r.user?.login === username);
      const userReviewComments = reviewComments.filter(
        (c) => c.user.login === username,
      );

      return {
        repo: { fullName: repoFullName, owner, name: repo },
        pr,
        reviews: userReviews,
        reviewComments: userReviewComments,
        timeline,
      };
    }
  } catch (error) {
    console.error(`Error syncing PR ${owner}/${repo}#${prNumber}:`, error);
    // Don't throw - continue with other PRs
  }
  return null;
}
