import z from 'zod';
import { InsightSchema } from './insights';
import { ActivityEventSchema } from './timeline';
import { SignalSchema } from './signals';

export const CalendarEventCategorySchema = z.enum([
  'personal',
  'ooo',
  'focus',
  'oneOnOne',
  'team',
  'org',
  'interview',
  'incident',
  'other',
]);

export const TeamMeetingSubtypeSchema = z.enum([
  'standup',
  'planning',
  'retro',
  'grooming',
  'demo',
  'designReview',
  'architecture',
  'status',
  'other',
]);
export type TeamMeetingSubtype = z.infer<typeof TeamMeetingSubtypeSchema>;

export const PrepMeetingTypeSchema = z.enum([
  'oneOnOne',
  'standup',
  'planning',
  'retro',
]);
export type PrepMeetingType = z.infer<typeof PrepMeetingTypeSchema>;

export const UpcomingCalendarEventSchema = z.object({
  id: z.string(),
  calendarId: z.string(),
  googleEventId: z.string(),
  recurringEventId: z.string().nullable().optional(),
  startAtISO: z.iso.datetime(),
  endAtISO: z.iso.datetime(),
  durationMinutes: z.number().int().nonnegative().nullable().optional(),
  isAllDay: z.boolean(),
  title: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  selfResponseStatus: z.string().nullable().optional(),
  isOrganizerSelf: z.boolean(),
  attendeesTotal: z.number().int().nonnegative(),
  attendeesAccepted: z.number().int().nonnegative(),
  attendeesDeclined: z.number().int().nonnegative(),
  attendeesNeedsAction: z.number().int().nonnegative(),
  category: CalendarEventCategorySchema,
  categorySubtype: TeamMeetingSubtypeSchema.nullable().optional(),
  categoryConfidence: z.number().min(0).max(1).nullable().optional(),
  categorySource: z.string().nullable().optional(),
  prepItemId: z.uuid().nullable().optional(),
  hasPrepRule: z.boolean().optional(),
  prepRuleId: z.uuid().nullable().optional(),
});

export type UpcomingCalendarEvent = z.infer<typeof UpcomingCalendarEventSchema>;

export const UpcomingCalendarEventsResponseSchema = z.object({
  nowISO: z.string(),
  items: z.array(UpcomingCalendarEventSchema),
  nextPrepSupported: UpcomingCalendarEventSchema.optional(),
  calendarConnected: z.boolean(),
  refreshed: z.boolean(),
});

export type UpcomingCalendarEventsResponse = z.infer<
  typeof UpcomingCalendarEventsResponseSchema
>;

const BaseGeneratePrepRequestSchema = z.object({
  timezone: z.string().min(1),
  prepItemId: z.uuid().optional(), // used for regen
});

export const CalendarGeneratePrepRequestSchema =
  BaseGeneratePrepRequestSchema.extend({
    source: z.literal('calendar'),
    calendarEventId: z.uuid(),
  });

export const ManualGeneratePrepRequestSchema =
  BaseGeneratePrepRequestSchema.extend({
    source: z.literal('manual'),
    manualKey: z.uuid(),
    meetingType: PrepMeetingTypeSchema, // required for manual
  });

export const PrepGenerateRequestSchema = z.discriminatedUnion('source', [
  CalendarGeneratePrepRequestSchema,
  ManualGeneratePrepRequestSchema,
]);

export type PrepGenerateRequest = z.infer<typeof PrepGenerateRequestSchema>;

export const PrepMetricSnapshotSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string().optional(),
  windowStart: z.string(),
  windowEnd: z.string(),
  windowKind: z.enum(['short', 'medium', 'long']),
  value: z.number().nullable(),
  formattedValue: z.string().optional(),
});
export type PrepMetricSnapshot = z.infer<typeof PrepMetricSnapshotSchema>;

export const PrepSectionKind = z.enum([
  'highlights',
  'discussion',
  'yesterday',
  'today',
  'blockers',
]);
export type TPrepSectionKind = z.infer<typeof PrepSectionKind>;

export const PrepTalkingPointSchema = z.object({
  id: z.string(),
  kind: PrepSectionKind,
  title: z.string(),
  body: z.string().optional(),
  order: z.number().int(),
  relatedSignalIds: z.array(z.string()).default([]),
  relatedInsightIds: z.array(z.string()).default([]),
  relatedMetricIds: z.array(z.string()).default([]),
  relatedPrIds: z.array(z.string()).default([]),
  relatedReviewIds: z.array(z.string()).default([]),
  relatedCalendarEventIds: z.array(z.string()).default([]),
});
export type PrepTalkingPoint = z.infer<typeof PrepTalkingPointSchema>;

export const PrepItemStatusEnum = z.enum([
  'pending',
  'generating',
  'ready',
  'archived',
  'dismissed',
]);

const PrepItemWindow = z.object({
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  source: z.string(),
});

export const PrepItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  calendarEventId: z.uuid().nullable(),
  source: z.string(),
  calendarId: z.string().nullable(),
  googleEventId: z.string().nullable(),
  recurringEventId: z.string().nullable(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime().nullable(),
  durationMinutes: z.number().nullable(),
  isAllDay: z.boolean(),
  title: z.string().nullable(),
  timezone: z.string(),
  primaryWindow: PrepItemWindow,
  seconaryWindow: PrepItemWindow,
  category: z.string().nullable(),
  categorySubtype: z.string().nullable(),
  meetingType: PrepMeetingTypeSchema,
  status: PrepItemStatusEnum,
  lastError: z.string().nullable().optional(),
  generationVersion: z.number().int(),

  talkingPoints: z.array(PrepTalkingPointSchema).default([]),
  usedInsights: z.array(InsightSchema).default([]),
  usedSignals: z.array(SignalSchema).default([]),
  usedMetrics: z.array(PrepMetricSnapshotSchema).default([]),
  usedPrs: z.array(ActivityEventSchema).default([]),
  usedReviews: z.array(ActivityEventSchema).default([]),
  usedCalendarEvents: z.array(UpcomingCalendarEventSchema).default([]),
});

export type PrepItem = z.infer<typeof PrepItemSchema>;

export const PrepItemResponseSchema = z.object({
  prep: PrepItemSchema,
});
export type PrepItemResponse = z.infer<typeof PrepItemResponseSchema>;

export const PrepItemListResponse = z.object({
  items: z.array(PrepItemSchema),
  nextCursor: z.string().nullable().optional(),
});
export type TPrepItemListResponse = z.infer<typeof PrepItemListResponse>;

export const UpdatePrepItemInput = z.object({
  status: PrepItemStatusEnum.optional(),
});
export type TUpdatePrepItemInput = z.infer<typeof UpdatePrepItemInput>;
