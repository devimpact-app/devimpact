import { z } from 'zod';

export const SeedReviewIntensitySchema = z.enum(['light', 'normal', 'heavy']);
export type SeedReviewIntensity = z.infer<typeof SeedReviewIntensitySchema>;

export const SeedPRSizeSchema = z.enum(['small', 'medium', 'large']);
export type SeedPRSize = z.infer<typeof SeedPRSizeSchema>;

export const SeedPRStateSchema = z.enum(['merged', 'open', 'closed']);
export type SeedPRState = z.infer<typeof SeedPRStateSchema>;

export const SeedPRSummarySchema = z.object({
  short: z.string().min(1).max(240),
  highlights: z.array(z.string().min(1).max(160)).max(8).optional(),
  typeTags: z.array(z.string().min(1).max(32)).max(8).optional(),
  domainTags: z.array(z.string().min(1).max(32)).max(8).optional(),
});
export type SeedPRSummary = z.infer<typeof SeedPRSummarySchema>;

export const SeedPullRequestSchema = z.object({
  dayIndex: z.number().int().min(0).max(200),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:mm'),

  repo: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1).max(160),
  projectKey: z.string().min(1),

  state: SeedPRStateSchema,

  reviewIntensity: SeedReviewIntensitySchema,
  size: SeedPRSizeSchema,
  touchedTests: z.boolean(),

  summary: SeedPRSummarySchema,
});
export type SeedPullRequest = z.infer<typeof SeedPullRequestSchema>;

export const SeedPullRequestsFileSchema = z.object({
  plan: z.array(z.string()),
  pullRequests: z.array(SeedPullRequestSchema).min(1),
});
export type SeedPullRequestsFile = z.infer<typeof SeedPullRequestsFileSchema>;
