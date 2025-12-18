import z from 'zod';

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
  lookaheadDays: z.number().int().positive(),
  items: z.array(UpcomingCalendarEventSchema),
  calendarConnected: z.boolean(),
  refreshed: z.boolean(),
});

export type UpcomingCalendarEventsResponse = z.infer<
  typeof UpcomingCalendarEventsResponseSchema
>;

const BaseGeneratePrepRequestSchema = z.object({
  timezone: z.string().min(1),
});

export const CalendarGeneratePrepRequestSchema =
  BaseGeneratePrepRequestSchema.extend({
    source: z.literal('calendar'),
    calendarEventId: z.uuid(),
    prepItemId: z.uuid().optional(), // used for regen
  });

export const ManualGeneratePrepRequestSchema =
  BaseGeneratePrepRequestSchema.extend({
    source: z.literal('manual'),
    manualKey: z.uuid(),
    meetingType: PrepMeetingTypeSchema, // required for manual
    title: z.string().trim().min(1).max(140).optional(),
    startAtISO: z.iso.datetime(),
    endAtISO: z.iso.datetime().optional(),
    durationMinutes: z
      .number()
      .int()
      .positive()
      .max(8 * 60)
      .optional(),
  }).superRefine((val, ctx) => {
    if (!val.endAtISO && !val.durationMinutes) {
      ctx.addIssue({
        code: 'custom',
        path: ['durationMinutes'],
        message: 'Provide either endAtISO or durationMinutes for manual prep.',
      });
    }
  });

export const PrepGenerateRequestSchema = z.discriminatedUnion('source', [
  CalendarGeneratePrepRequestSchema,
  ManualGeneratePrepRequestSchema,
]);

export type PrepGenerateRequest = z.infer<typeof PrepGenerateRequestSchema>;
