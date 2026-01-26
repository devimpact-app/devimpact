import { z } from 'zod';

export const BackfillCursorSchema = z.object({
  v: z.literal(1),
  step: z.enum(['summarize_prs', 'threading', 'done']),
  windowStartISO: z.iso.datetime(),
  windowEndISO: z.iso.datetime(),
  lookbackDays: z.number().int().min(1).max(90),
  summarize: z
    .object({
      perRun: z.number().int().min(1).max(50),
      pass: z.number().int().min(0),
      concurrency: z.number().int().min(1).max(10),
      succeeded: z.number().int().min(0).optional(),
      failed: z.number().int().min(0).optional(),
      beforeSortAtISO: z.iso.datetime().optional(),
    })
    .optional(),
  threading: z
    .object({
      claimedCount: z.number().int().min(0).optional(),
      eligibleCount: z.number().int().min(0).optional(),
      ineligibleCount: z.number().int().min(0).optional(),
      threadedCount: z.number().int().min(0).optional(),
      deferredCount: z.number().int().min(0).optional(),
      perRun: z.number().int().min(1).max(50),
    })
    .optional(),
  startedAtISO: z.string().optional(),
});
export type BackfillCursor = z.infer<typeof BackfillCursorSchema>;

export type BackfillProgress = {
  message: string;
  step: BackfillCursor['step'];
  current?: number;
};
