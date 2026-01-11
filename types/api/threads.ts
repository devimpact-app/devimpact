import z from 'zod';
import { ActivityEventSchema } from './timeline';
import { UpcomingCalendarEventSchema } from './prep';

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
export type ActivityKind = z.infer<typeof ActivityKindSchema>;

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
    titleUserEditedAt: z.iso.datetime().nullable(),
    summaryHeadline: z.string().max(2000),
    headlineUserEditedAt: z.iso.datetime().nullable(),
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

export const ActivityEventMetadataSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('pr'),
      size: z.object({
        linesChanged: z.number().int().min(0),
        filesChanged: z.number().int().min(0),
        commitsCount: z.number().int().min(0).optional(),
      }),
      shape: z.object({
        touchedTests: z.boolean(),
      }),
      process: z
        .object({
          reviewRounds: z.number().int().min(0).optional(),
          uniqueReviewers: z.number().int().min(0).optional(),
        })
        .optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('review'),
      decision: z.enum(['approved', 'changes_requested', 'commented']),
      depth: z.object({
        commentsCount: z.number().int().min(0),
      }),
      role: z.object({
        wasDirectlyRequested: z.boolean(),
        wasFirstReview: z.boolean().optional(),
        isBlocking: z.boolean().optional(),
      }),
    })
    .strict(),
  z
    .object({
      kind: z.literal('meeting'),
      participation: z.object({
        selfResponseStatus: z.enum([
          'accepted',
          'declined',
          'tentative',
          'needsAction',
        ]),
        isOrganizerSelf: z.boolean(),
      }),
      structure: z.object({
        isRecurring: z.boolean(),
        recurringEventId: z.string().optional(),
        durationMinutes: z.number().int().min(0),
        isAllDay: z.boolean(),
      }),
      classification: z
        .object({
          category: z.string().optional(),
          categorySubtype: z.string().optional(),
          categoryConfidence: z.number().min(0).max(1).optional(),
          categorySource: z
            .enum(['heuristic', 'llm', 'user', 'seed'])
            .optional(),
        })
        .optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('ooo'),
      isAllDay: z.boolean(),
      durationMinutes: z.number().int().min(0).optional(),
    })
    .strict(),
]);

export type ActivityEventMetadata = z.infer<typeof ActivityEventMetadataSchema>;

export const ThreadEventListItemSchema = z
  .object({
    eventId: z.uuid(),
    kind: ActivityKindSchema,
    occurredAt: z.iso.datetime(),
    endAt: z.iso.datetime().nullable().optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(200).nullable().optional(),
    url: z.string().url().nullable().optional(),
    repoFullName: z.string().min(1).max(200).nullable().optional(),
    prNumber: z.number().int().positive().nullable().optional(),
    assignment: z
      .object({
        assignedBy: z.enum(['llm', 'user', 'heuristic']),
        confidence: z.number().min(0).max(1).nullable().optional(),
        reason: z.string().max(200).nullable().optional(),
        createdAt: z.iso.datetime().optional(),
      })
      .strict(),
    inspectorRef: z
      .object({
        source: z.enum(['github', 'gcal']),
        sourceEntityTable: z.enum([
          'pull_requests',
          'reviews',
          'calendar_events',
        ]),
        sourceEntityId: z.uuid(),
      })
      .strict(),
    metadata: ActivityEventMetadataSchema.nullable().optional(),
  })
  .strict();

export type ThreadEventListItem = z.infer<typeof ThreadEventListItemSchema>;

export const ThreadBulletSourceSchema = z.enum(['llm', 'user']);
export type ThreadBulletSource = z.infer<typeof ThreadBulletSourceSchema>;

export const ThreadSummaryBulletSchema = z
  .object({
    id: z.uuid(),
    sortIndex: z.number().int().min(0),
    text: z.string().min(1).max(280),
    referencedEventIds: z.array(z.uuid()).max(50).default([]),
    source: ThreadBulletSourceSchema,
    editable: z.boolean(),
    generatedAt: z.iso.datetime().nullable(),
    userEditedAt: z.iso.datetime().nullable(),
  })
  .strict();

export type ThreadSummaryBullet = z.infer<typeof ThreadSummaryBulletSchema>;

export const GetThreadDetailResponseSchema = z
  .object({
    thread: ThreadListItemSchema,
    bullets: z.array(ThreadSummaryBulletSchema),
    events: z.array(ThreadEventListItemSchema),
    nextCursor: z.string().nullable().optional(),
  })
  .strict();

export type GetThreadDetailResponse = z.infer<
  typeof GetThreadDetailResponseSchema
>;

export const LegacyActivityEventSchema = ActivityEventSchema;
export const CalendarInspectorEventSchema = UpcomingCalendarEventSchema;

export const ActivityEventInspectorResponseSchema = z.discriminatedUnion(
  'kind',
  [
    z
      .object({
        kind: z.literal('legacy_activity_event'),
        event: LegacyActivityEventSchema,
      })
      .strict(),

    z
      .object({
        kind: z.literal('calendar_event'),
        event: CalendarInspectorEventSchema,
      })
      .strict(),
  ]
);

export type ActivityEventInspectorResponse = z.infer<
  typeof ActivityEventInspectorResponseSchema
>;
