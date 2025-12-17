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

export const UpcomingCalendarEventSchema = z.object({
  id: z.string(),

  calendarId: z.string(),
  googleEventId: z.string(),
  recurringEventId: z.string().nullable().optional(),

  startAtISO: z.string(),
  endAtISO: z.string(),
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
});

export type UpcomingCalendarEvent = z.infer<typeof UpcomingCalendarEventSchema>;

export const UpcomingCalendarEventsResponseSchema = z.object({
  nowISO: z.string(),
  lookaheadDays: z.number().int().positive(),
  items: z.array(UpcomingCalendarEventSchema),
  calendarConnected: z.boolean(),
});

export type UpcomingCalendarEventsResponse = z.infer<
  typeof UpcomingCalendarEventsResponseSchema
>;
