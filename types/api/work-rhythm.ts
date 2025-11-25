import { z } from 'zod';

export const WeekdayKeySchema = z.enum([
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
]);
export type WeekdayKey = z.infer<typeof WeekdayKeySchema>;

export const TimeBandKeySchema = z.enum([
  'early', // ~5–9am
  'am', // ~9–12pm
  'pm', // ~12–6pm
  'eve', // ~6–10pm
]);
export type TimeBandKey = z.infer<typeof TimeBandKeySchema>;

// Raw heatmap bucket (basically your grid values)
export const WorkRhythmBucketSchema = z.object({
  day: WeekdayKeySchema,
  band: TimeBandKeySchema,
  eventCount: z.number(), // raw count used for heatmap intensity
  codeEvents: z.number(), // optional: commits / authored PR work
  reviewEvents: z.number(), // optional: review activity
});
export type WorkRhythmBucket = z.infer<typeof WorkRhythmBucketSchema>;

export const BestFocusWindowSchema = z.object({
  day: WeekdayKeySchema,
  band: TimeBandKeySchema,
  score: z.number(), // ranking score
  label: z.string(), // e.g. “Tuesday 9–11 AM”
});
export type BestFocusWindow = z.infer<typeof BestFocusWindowSchema>;

export const ProtectWindowSchema = z.object({
  day: WeekdayKeySchema,
  band: TimeBandKeySchema,
  label: z.string(), // human string: "Protect 9–11 AM on Tuesdays"
});
export type ProtectWindow = z.infer<typeof ProtectWindowSchema>;

export const WorkRhythmSummarySchema = z.object({
  description: z.string(), // paragraph summary (deterministic for v0)
  bestFocusWindows: z.array(BestFocusWindowSchema),
  avgDeepWorkBlocksPerWeek: z.number(),
  eveningSharePercent: z.number(),
  protectWindows: z.array(ProtectWindowSchema),
});

// Full response schema
export const WorkRhythmSchema = z.object({
  version: z.literal(1),
  range: z.object({
    startISO: z.string(), // last X days
    endISO: z.string(),
    label: z.string(),
  }),
  buckets: z.array(WorkRhythmBucketSchema), // FLATTENED list, easier for FE
  maxBucketCount: z.number(), // for heatmap normalization
  summary: WorkRhythmSummarySchema,
});

export type WorkRhythm = z.infer<typeof WorkRhythmSchema>;
