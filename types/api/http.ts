import { TIMELINE_RANGE_KEYS } from '@/lib/utils/date';
import z from 'zod';

export const TimelineRangeKeySchema = z.enum(TIMELINE_RANGE_KEYS);
export type TimelineRangeKey = z.infer<typeof TimelineRangeKeySchema>;

export const ApiSuccess = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ ok: z.literal(true), data: schema });

export const ApiError = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
