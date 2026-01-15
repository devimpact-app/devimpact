import { z } from 'zod';

export const ActivityEventKindSchema = z.enum([
  'pr_opened',
  'pr_merged',
  'pr_commit',
  'commit_cluster',
  'review_submitted',
  'meeting',
]);

export const ActivitySourceSchema = z.enum(['github', 'gcal']);

export const ActivityEventMetaSchema = z
  .object({
    prTitle: z.string().optional(),
    prNumber: z.number().int().optional(),
    repoFullName: z.string().optional(),
    linesChanged: z.number().int().optional(),
    filesChanged: z.number().int().optional(),
    reviewLatencySeconds: z.number().nullable().optional(),
    reviewState: z.string().optional(),
    isFirstResponder: z.boolean().optional(),
    stateLabel: z.string().optional(), // "merged", "open", etc.
    commitCount: z.number().int().optional(),
  })
  .optional();

export const ActivityEventLinksSchema = z
  .object({
    htmlUrl: z.string().url().optional(),
  })
  .optional();

export const ActivityEventSchema = z.object({
  id: z.string(), // e.g. `pr:merged:uuid` or `review:uuid`
  kind: ActivityEventKindSchema,
  source: ActivitySourceSchema,
  occurredAt: z.string().datetime(), // ISO string
  actor: z.object({
    login: z.string(),
    avatarUrl: z.string().url().optional(),
  }),
  title: z.string(),
  subtitle: z.string().optional(),
  meta: ActivityEventMetaSchema,
  links: ActivityEventLinksSchema,
});

export const ActivityEventsResponseSchema = z.object({
  events: z.array(ActivityEventSchema),
});

export type ActivityEventKind = z.infer<typeof ActivityEventKindSchema>;
export type ActivitySource = z.infer<typeof ActivitySourceSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type ActivityEventsResponse = z.infer<
  typeof ActivityEventsResponseSchema
>;
