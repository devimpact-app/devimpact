import { Octokit } from "@octokit/rest";
import { fetchPRFiles } from "../api/fetch-pr-files";
import { fetchPRCommits } from "../api/fetch-pr-commits";
import { fetchPRReviews } from "../api/fetch-pr-reviews";
import { fetchPRReviewComments } from "../api/fetch-pr-review-comments";
import { fetchPRTimeline } from "../api/fetch-pr-timeline";
import { storePR } from "../storage/store-pr";
import { storePRFiles } from "../storage/store-pr-files";
import { storePRCommits } from "../storage/store-pr-commits";
import { storeReviews } from "../storage/store-reviews";
import { storeReviewComments } from "../storage/store-review-comments";
import { storeTimelineEvents } from "../storage/store-timeline-events";
import { storeRawData } from "../storage/store-raw-data";
import { GitHubSearchPullRequest } from "../api/types/PullRequest";

export interface SyncPRDetailsOptions {
  userId: string;
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  pr: GitHubSearchPullRequest; // Basic PR from list
  mode: "authored" | "reviewed";
  username: string; // For filtering reviews
}

export async function syncPRDetails(options: SyncPRDetailsOptions) {
  const { userId, octokit, owner, repo, prNumber, pr, mode, username } =
    options;

  try {
    const repoFullName = `${owner}/${repo}`;

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

      // Store raw data
      await storeRawData(userId, repoFullName, prNumber, {
        pr,
        files,
        commits,
        reviews,
        reviewComments,
        timeline,
      });

      // Store normalized data
      const prId = await storePR(userId, pr, repoFullName, files, commits);
      await storePRFiles(prId, files, username);
      await storePRCommits(prId, commits, username);
      await storeReviews(prId, userId, reviews, username);
      await storeReviewComments(prId, userId, reviewComments, username);
      await storeTimelineEvents(prId, userId, timeline);
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

      // Store raw data
      await storeRawData(userId, repoFullName, prNumber, {
        pr,
        reviews: userReviews,
        reviewComments: userReviewComments,
        timeline,
      });

      // Store normalized data (lightweight PR, no files/commits)
      const prId = await storePR(userId, pr, repoFullName, [], []);
      await storeReviews(prId, userId, userReviews, username);
      await storeReviewComments(prId, userId, userReviewComments, username);
      await storeTimelineEvents(prId, userId, timeline);
    }
  } catch (error) {
    console.error(`Error syncing PR ${owner}/${repo}#${prNumber}:`, error);
    // Don't throw - continue with other PRs
  }
}
