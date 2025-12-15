import { z } from 'zod';

export const CalendarSyncStatusEnum = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
]);

export const CalendarSyncModeEnum = z.enum(['initial', 'manual', 'scheduled']);

export const CalendarSetupStateEnum = z.enum([
  'not_connected',
  'connected_no_calendars',
  'connected_no_selection',
  'ready_to_sync',
  'syncing',
  'synced',
  'error',
]);

export const CalendarSyncRunSchema = z.object({
  id: z.string(),
  status: CalendarSyncStatusEnum,
  mode: CalendarSyncModeEnum,
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  calendarsSyncedCount: z.number().int(),
  eventsUpsertedCount: z.number().int(),
  errorCode: z.string().nullable().optional(),
});

export const CalendarStatusResponseSchema = z.object({
  state: CalendarSetupStateEnum,
  connected: z.boolean(),
  availableCalendarsCount: z.number().int(),
  selectedCalendarsCount: z.number().int(),
  lastSyncRun: CalendarSyncRunSchema.nullable().optional(),
});

export type CalendarStatusResponse = z.infer<
  typeof CalendarStatusResponseSchema
>;

export const AvailableCalendarSchema = z.object({
  id: z.string(),
  isSelected: z.boolean(),
  calendarId: z.string(),
  summary: z.string(),
  accessRole: z.string().nullable(),
  timeZone: z.string().nullable(),
  isPrimary: z.boolean(),
});

export type AvailableCalendar = z.infer<typeof AvailableCalendarSchema>;

export const ListAvailableCalendarResponseSchema = z.object({
  calendars: z.array(AvailableCalendarSchema),
});

export type ListAvailableCalendarResponse = z.infer<
  typeof ListAvailableCalendarResponseSchema
>;

export const CalendarSelectionInputSchema = z.object({
  selectedCalendarIds: z.array(z.string()),
});
