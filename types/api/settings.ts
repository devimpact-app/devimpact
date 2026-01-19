import z from 'zod';

export const PatchMeSchema = z
  .object({
    timezone: z.string().min(1).max(64).optional(),
    weeklySummaryEmailEnabled: z.boolean().optional(),
  })
  .strict();
