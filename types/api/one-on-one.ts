import { z } from 'zod';
import { InsightSchema } from '@/types/api/insights';

export const OneOnOneMetricSnapshotSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string().optional(),
  windowStart: z.string(),
  windowEnd: z.string(),
  value: z.number().nullable(),
  formattedValue: z.string().optional(),
});
export type OneOnOneMetricSnapshot = z.infer<
  typeof OneOnOneMetricSnapshotSchema
>;

export const OneOnOneSectionKind = z.enum([
  'highlights',
  'friction',
  'asks',
  'feedback_for_manager',
  'goals',
  'metrics',
  'insights',
]);
export type TOneOnOneSectionKind = z.infer<typeof OneOnOneSectionKind>;

export const OneOnOneTalkingPointSchema = z.object({
  id: z.string(),
  kind: OneOnOneSectionKind,
  title: z.string(),
  body: z.string().optional(),
  order: z.number().int(),
  relatedInsightIds: z.array(z.string()).default([]),
  relatedMetricIds: z.array(z.string()).default([]),
});
export type OneOnOneTalkingPoint = z.infer<typeof OneOnOneTalkingPointSchema>;

export const OneOnOneMetricChipSchema = z.object({
  label: z.string(), // "Cycle time"
  value: z.string(), // "18.2h"
  tooltip: z.string().optional(), // "Median from ready → merge"
});

export const OneOnOneStatusEnum = z.enum(['draft', 'final', 'archived']);
export const CounterpartTypeEnum = z.enum([
  'manager',
  'peer',
  'direct_report',
  'other',
]);
export type CounterpartType = z.infer<typeof CounterpartTypeEnum>;

export const OneOnOnePrepSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  meetingAt: z.string().nullable(),
  shortWindowStart: z.string(),
  shortWindowEnd: z.string(),
  mediumWindowStart: z.string(),
  mediumWindowEnd: z.string(),

  title: z.string().nullable(),
  counterpartLabel: z.string().optional(), // optional
  counterpartType: CounterpartTypeEnum,

  status: OneOnOneStatusEnum,
  errorMessage: z.string().nullable().optional(),

  talkingPoints: z.array(OneOnOneTalkingPointSchema).default([]),
  usedInsights: z.array(InsightSchema).default([]),
  usedMetrics: z.array(OneOnOneMetricSnapshotSchema).default([]),

  meta: z.object().optional(),
});

export type OneOnOnePrep = z.infer<typeof OneOnOnePrepSchema>;

export const CreateOneOnOneInput = z.object({
  meetingAt: z.string().optional(),
  counterpartLabel: z.string().optional(),
  counterpartType: CounterpartTypeEnum.optional(),
  title: z.string().optional(),
  timezone: z.string(),

  // For the short window
  windowWeeks: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(2),

  // Optional extra context / focus
  // focusAreas: z
  //   .array(z.enum(['progress', 'friction', 'career', 'feedback', 'team']))
  //   .optional(),
  // freeformContext: z.string().optional(),
});
export type TCreateOneOnOneInput = z.infer<typeof CreateOneOnOneInput>;

export const OneOnOneResponse = z.object({
  prep: OneOnOnePrepSchema,
});
export type TOneOnOneResponse = z.infer<typeof OneOnOneResponse>;

export const OneOnOneListItemSchema = OneOnOnePrepSchema.pick({
  id: true,
  title: true,
  meetingAt: true,
  createdAt: true,
  shortWindowStart: true,
  shortWindowEnd: true,
  mediumWindowStart: true,
  mediumWindowEnd: true,
  status: true,
  meta: true,
});

export const OneOnOneListResponse = z.object({
  items: z.array(OneOnOneListItemSchema),
  nextCursor: z.string().nullable().optional(),
});
export type TOneOnOneListResponse = z.infer<typeof OneOnOneListResponse>;

export const RegenerateOneOnOneInput = z.object({
  // For the short window
  windowWeeks: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
});
export type TRegenerateOneOnOneInput = z.infer<typeof RegenerateOneOnOneInput>;
