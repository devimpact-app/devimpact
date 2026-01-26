import {
  CalendarEventCategorySchema,
  TeamMeetingSubtypeSchema,
} from '@/types/api/prep';
import { z } from 'zod';

export const SeedDayOfWeekSchema = z.number().int().min(0).max(6);

export const SeedHHmmSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Expected HH:mm');

export const SeedCalendarKindSchema = z.enum([
  'meeting',
  'ooo',
  'focus',
  'personal',
]);
export type SeedCalendarKind = z.infer<typeof SeedCalendarKindSchema>;

export const SeedSelfResponseStatusSchema = z.enum([
  'accepted',
  'declined',
  'tentative',
  'needsAction',
]);
export type SeedSelfResponseStatus = z.infer<
  typeof SeedSelfResponseStatusSchema
>;

export const SeedCalendarWindowSchema = z.object({
  startDayIndex: z.number().int().min(0).max(366),
  endDayIndex: z.number().int().min(0).max(366),
});

export const SeedCalendarBaseSchema = z
  .object({
    kind: SeedCalendarKindSchema,
    title: z.string().min(1).max(160),
    category: CalendarEventCategorySchema,
    subtype: TeamMeetingSubtypeSchema.optional(),
    timezone: z.string().min(1).optional(),

    durationMinutes: z
      .number()
      .int()
      .min(5)
      .max(12 * 60),
    selfResponseStatus: SeedSelfResponseStatusSchema.default('accepted'),
    isOrganizerSelf: z.boolean().default(false),

    attendeesTotal: z.number().int().min(0).max(500).optional(),
  })
  .strict();

export const SeedRecurringSeriesSchema = SeedCalendarBaseSchema.extend({
  seriesKey: z.string().min(1).max(80),
  daysOfWeek: z.array(SeedDayOfWeekSchema).min(1).max(7),
  startTime: SeedHHmmSchema,
  window: SeedCalendarWindowSchema,

  everyNWeeks: z.number().int().min(1).max(12).optional(),
  weekOffset: z.number().int().min(0).max(11).optional(),

  skipDayIndices: z.array(z.number().int().min(0).max(366)).optional(),
});

export type SeedRecurringSeries = z.infer<typeof SeedRecurringSeriesSchema>;

export const SeedOneOffEventSchema = SeedCalendarBaseSchema.extend({
  dayIndex: z.number().int().min(0).max(366),
  startTime: SeedHHmmSchema.optional(),
  isAllDay: z.boolean().default(false),
});

export type SeedOneOffEvent = z.infer<typeof SeedOneOffEventSchema>;

export const SeedCalendarFileSchema = z.object({
  recurringSeries: z.array(SeedRecurringSeriesSchema).default([]),
  oneOffEvents: z.array(SeedOneOffEventSchema).default([]),
});

export type SeedCalendarFile = z.infer<typeof SeedCalendarFileSchema>;
