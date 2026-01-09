import z from 'zod';

export const ThreadCategorySchema = z.enum([
  'features',
  'bugs_incidents',
  'tech_debt',
  'collaboration',
  'alignment',
  'skill_growth',
  'hiring',
]);
export type ThreadCategory = z.infer<typeof ThreadCategorySchema>;

export const ThreadStatusSchema = z.enum(['active', 'archived']);

export const ActivityKindSchema = z.enum(['pr', 'review', 'meeting', 'ooo']);

export const ThreadLastUpdateSchema = z
  .object({
    headline: z.string().min(1).max(220).optional(),
    bullets: z.array(z.string().min(1).max(200)).max(6).optional(),
    referencedEventIds: z.array(z.string().uuid()).default([]),
    generatedAt: z.iso.datetime(),
  })
  .strict();

export const ThreadEventPreviewSchema = z.object({
  eventId: z.uuid(),
  kind: ActivityKindSchema,
  occurredAt: z.iso.datetime(),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).nullable().optional(),
  url: z.string().url().nullable().optional(),
  repoFullName: z.string().min(1).max(200).nullable().optional(),
  prNumber: z.number().int().positive().nullable().optional(),
});
export type ThreadEventPreview = z.infer<typeof ThreadEventPreviewSchema>;

export const ThreadListItemSchema = z
  .object({
    id: z.uuid(),
    categoryKey: ThreadCategorySchema,
    title: z.string().min(1).max(120),
    summary: z.string().max(2000), // allow empty string
    status: ThreadStatusSchema,
    confidence: z.number().min(0).max(1).nullable(),
    firstActivityAt: z.iso.datetime().nullable(),
    lastActivityAt: z.iso.datetime().nullable(),
    userEditedAt: z.iso.datetime().nullable(),
    lastUpdate: ThreadLastUpdateSchema.nullable(),
    eventCountTotal: z.number().int().min(0),
    eventCountsByKind: z
      .object({
        pr: z.number().int().min(0).default(0),
        review: z.number().int().min(0).default(0),
        meeting: z.number().int().min(0).default(0),
        ooo: z.number().int().min(0).default(0),
      })
      .strict(),

    recentRepos: z.array(z.string().min(1).max(200)).max(3).default([]),
    lastEvent: ThreadEventPreviewSchema.nullable(),
  })
  .strict();

export type ThreadListItem = z.infer<typeof ThreadListItemSchema>;

export const GetThreadsResponseSchema = z
  .object({
    threads: z.array(ThreadListItemSchema),
    nextCursor: z.string().nullable().optional(),
  })
  .strict();

export type GetThreadsResponse = z.infer<typeof GetThreadsResponseSchema>;
