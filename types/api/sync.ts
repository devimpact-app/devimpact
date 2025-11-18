import {
  GitHubPRCommit,
  GitHubPRFile,
  GitHubReview,
  GitHubReviewComment,
  GitHubTimelineEvent,
} from "@/lib/integrations/github/api/types";
import { GitHubSearchPullRequest } from "@/lib/integrations/github/api/types/PullRequest";
import z from "zod";

export const RepoMetadataSchema = z.object({
  id: z.number(),
  ownerLogin: z.string(),
  name: z.string(),
  fullName: z.string(),
  htmlUrl: z.string().url(),

  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  visibility: z.enum(["public", "private", "internal"]),

  defaultBranch: z.string(),
  primaryLanguage: z.string().nullable(),

  createdAt: z.string().nullable(),
  pushedAt: z.string().nullable(),
});

export const HydratedPrSchema = z.object({
  pr: z.custom<GitHubSearchPullRequest>(),

  commits: z.array(z.custom<GitHubPRCommit>()),
  files: z.array(z.custom<GitHubPRFile>()),
  reviews: z.array(z.custom<GitHubReview>()),
  reviewComments: z.array(z.custom<GitHubReviewComment>()),
  timelineEvents: z.array(z.custom<GitHubTimelineEvent>()),
});

export const RepoSyncPayloadSchema = z.object({
  repo: RepoMetadataSchema,
  pulls: z.array(HydratedPrSchema),
  syncWindow: z.object({
    startISO: z.string(),
    endISO: z.string(),
  }),
  githubLogin: z.string(),
});
