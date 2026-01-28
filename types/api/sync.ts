import {
  SanitizedPR,
  SanitizedPRCommit,
  SanitizedPRFile,
  SanitizedPRReview,
  SanitizedPRReviewComment,
  SanitizedPRTimelineEvent,
} from '@/lib/integrations/github/types';
import z from 'zod';

export const RepoMetadataSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  private: z.boolean(),
  archived: z.boolean(),
  visibility: z.enum(['public', 'private', 'internal']),
  pushedAt: z.string().nullable(),
});

export type RepoMetadata = z.infer<typeof RepoMetadataSchema>;

export const HydratedPrSchema = z.object({
  pr: z.custom<SanitizedPR>(),

  commits: z.array(z.custom<SanitizedPRCommit>()),
  files: z.array(z.custom<SanitizedPRFile>()),
  reviews: z.array(z.custom<SanitizedPRReview>()),
  reviewComments: z.array(z.custom<SanitizedPRReviewComment>()),
  timelineEvents: z.array(z.custom<SanitizedPRTimelineEvent>()),
});

export const RepoSyncPayloadSchema = z.object({
  repo: RepoMetadataSchema,
  pulls: z.array(HydratedPrSchema),
  syncWindow: z.object({
    startISO: z.string(),
    endISO: z.string(),
  }),
  githubLogin: z.string(),
  isLastBatch: z.boolean(),
});

export type RepoSyncPayload = z.infer<typeof RepoSyncPayloadSchema>;

export const AvailableReposInputSchema = z.object({
  repos: z.array(RepoMetadataSchema),
  githubLogin: z.string(),
});

export type AvailableReposInput = z.infer<typeof AvailableReposInputSchema>;
