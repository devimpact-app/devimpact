import { z } from 'zod';

export const BootstrapCursorSchema = z.object({
  v: z.literal(1),
  step: z.enum([
    'normalize',
    'derive_events',
    'summarize_prs',
    'threading',
    'weekly_summary',
    'done',
  ]),
  lookbackDays: z.number().int().min(1).max(60),
  normalize: z
    .object({
      touchedPrIds: z.array(z.string()).default([]),
      touchedReviewIds: z.array(z.string()).default([]),
    })
    .optional(),
  summarize: z
    .object({
      items: z
        .array(
          z.object({
            prId: z.string(),
            mode: z.enum(['authored', 'reviewed']),
          })
        )
        .default([]),
      idx: z.number().int().min(0),
      perRun: z.number().int().min(1).max(50),
      concurrency: z.number().int().min(1).max(10),
      succeeded: z.number().int().min(0).optional(),
      failed: z.number().int().min(0).optional(),
    })
    .optional(),
  startedAtISO: z.string().optional(),
});
export type BootstrapCursor = z.infer<typeof BootstrapCursorSchema>;

export type BootstrapProgress = {
  message: string;
  step: BootstrapCursor['step'];
  current?: number;
  total?: number;
};
