import {
  GitHubPRCommit,
  GitHubPRFile,
  GitHubReview,
  GitHubReviewComment,
  GitHubTimelineEvent,
} from "../api/types";
import { GitHubSearchPullRequest } from "../api/types/PullRequest";

export type PRIngestBundle = {
  repo: { fullName: string; owner: string; name: string };
  pr: GitHubSearchPullRequest;
  files?: Array<GitHubPRFile>;
  commits?: Array<GitHubPRCommit>;
  reviews?: Array<GitHubReview>;
  reviewComments?: Array<GitHubReviewComment>;
  timeline?: Array<GitHubTimelineEvent>;
};
