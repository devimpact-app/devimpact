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
  'early', // ~5–8am
  'morning', // ~8–11am
  'midday', // ~11am–2pm
  'afternoon', // ~2pm-6pm
  'eve', // ~6pm-5am
]);
export type TimeBandKey = z.infer<typeof TimeBandKeySchema>;

// Raw heatmap bucket (basically your grid values)
export const WorkRhythmBucketSchema = z.object({
  day: WeekdayKeySchema,
  band: TimeBandKeySchema,
  eventCount: z.number(), // raw count used for heatmap intensity
  codeEvents: z.number(), // optional: commits / authored PR work
  reviewEvents: z.number(), // optional: review activity
  meetings: z
    .object({
      bandMinutes: z.number(), // total mins in band
      meetingMinutes: z.number(), // minutes scheduled in meetings
      meetingCount: z.number(), // # of meeting events intersecting this band
      meetingShare: z.number().min(0).max(1), // meetingMinutes / bandMinutes
    })
    .optional(),
});
export type WorkRhythmBucket = z.infer<typeof WorkRhythmBucketSchema>;

export const BestFocusWindowSchema = z.object({
  day: WeekdayKeySchema,
  band: TimeBandKeySchema,
  score: z.number(), // ranking score
  label: z.string(), // e.g. “Tuesday 9–11 AM”

  // optional calendar stuff
  meetingShare: z.number().min(0).max(1).optional(),
  meetingPenaltyApplied: z.boolean().optional(),
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
  calendar: z.object({
    connected: z.boolean(),
  }),
  buckets: z.array(WorkRhythmBucketSchema), // FLATTENED list, easier for FE
  maxBucketCount: z.number(), // for heatmap normalization
  summary: WorkRhythmSummarySchema,
});

export type WorkRhythm = z.infer<typeof WorkRhythmSchema>;
