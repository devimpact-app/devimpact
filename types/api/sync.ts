import {
  SanitizedPR,
  SanitizedPRCommit,
  SanitizedPRFile,
  SanitizedPRReview,
  SanitizedPRReviewComment,
  SanitizedPRTimelineEvent,
} from '@/lib/integrations/github/types'
import z from 'zod'

export const RepoMetadataSchema = z.object({
  id: z.number(),
  ownerLogin: z.string(),
  name: z.string(),
  fullName: z.string(),
  htmlUrl: z.string().url(),

  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  visibility: z.enum(['public', 'private', 'internal']),

  defaultBranch: z.string(),
  primaryLanguage: z.string().nullable(),

  createdAt: z.string().nullable(),
  pushedAt: z.string().nullable(),
})

export type RepoMetadata = z.infer<typeof RepoMetadataSchema>

export const HydratedPrSchema = z.object({
  pr: z.custom<SanitizedPR>(),

  commits: z.array(z.custom<SanitizedPRCommit>()),
  files: z.array(z.custom<SanitizedPRFile>()),
  reviews: z.array(z.custom<SanitizedPRReview>()),
  reviewComments: z.array(z.custom<SanitizedPRReviewComment>()),
  timelineEvents: z.array(z.custom<SanitizedPRTimelineEvent>()),
})

export const RepoSyncPayloadSchema = z.object({
  repo: RepoMetadataSchema,
  pulls: z.array(HydratedPrSchema),
  syncWindow: z.object({
    startISO: z.string(),
    endISO: z.string(),
  }),
  githubLogin: z.string(),
  isLastBatch: z.boolean(),
})

export type RepoSyncPayload = z.infer<typeof RepoSyncPayloadSchema>
