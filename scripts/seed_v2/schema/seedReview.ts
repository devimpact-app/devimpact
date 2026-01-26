import { z } from 'zod';
import { SeedPRSizeSchema, SeedPRSummarySchema } from './seedPullRequest';

export const SeedReviewStateSchema = z.enum([
  'COMMENTED',
  'APPROVED',
  'CHANGES_REQUESTED',
]);
export type SeedReviewState = z.infer<typeof SeedReviewStateSchema>;

export const SeedReviewSchema = z.object({
  dayIndex: z.number().int().min(0).max(200),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:mm'),
  target: z.object({
    repo: z.string().min(1),
    number: z.number().int().positive(),
    author: z.string(),
    prContext: z.object({
      title: z.string().min(1).max(160),
      summary: SeedPRSummarySchema,
      size: SeedPRSizeSchema,
      touchedTests: z.boolean(),
    }),
  }),
  state: SeedReviewStateSchema,
  anchorType: z.string(),
  role: z.object({
    wasDirectlyRequested: z.boolean(),
    wasFirstReview: z.boolean(),
    isBlockingReview: z.boolean(),
  }),
  commentsCount: z.number().int().min(0).max(50),
  bodyHint: z.string(),
});
export type SeedReview = z.infer<typeof SeedReviewSchema>;

export const SeedReviewsFileSchema = z.object({
  reviews: z.array(SeedReviewSchema).min(1),
});
export type SeedReviewsFile = z.infer<typeof SeedReviewsFileSchema>;
