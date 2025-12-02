import { z } from 'zod';
import { InsightSchema } from '@/types/api/insights';
import { ActivityEventSchema } from './timeline';

export const OneOnOneMetricSnapshotSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string().optional(),
  windowStart: z.string(),
  windowEnd: z.string(),
  windowKind: z.enum(['short', 'medium', 'long']),
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
  relatedPrIds: z.array(z.string()).default([]),
  relatedReviewIds: z.array(z.string()).default([]),
});
export type OneOnOneTalkingPoint = z.infer<typeof OneOnOneTalkingPointSchema>;

export const OneOnOneMetricChipSchema = z.object({
  label: z.string(), // "Cycle time"
  value: z.string(), // "18.2h"
  tooltip: z.string().optional(), // "Median from ready → merge"
});

export const OneOnOneStatusEnum = z.enum(['ready', 'archived']);
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
  shortWindowWeeks: z.number().int().optional(),
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
  usedPrs: z.array(ActivityEventSchema).default([]),
  usedReviews: z.array(ActivityEventSchema).default([]),

  meta: z.object().optional(),
});

export type OneOnOnePrep = z.infer<typeof OneOnOnePrepSchema>;

export const CreateOneOnOneInput = z.object({
  meetingAt: z.string().optional(),
  shortWindowStart: z.string().optional(),
  counterpartLabel: z.string().optional(),
  counterpartType: CounterpartTypeEnum.optional(),
  title: z.string().optional(),
  timezone: z.string(),

  // For the short window
  windowWeeks: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(4),
      z.literal(8),
      z.literal(12),
    ])
    .optional(),
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
  windowWeeks: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
  timezone: z.string(),
});
export type TRegenerateOneOnOneInput = z.infer<typeof RegenerateOneOnOneInput>;

export const UpdateOneOnOneInput = z.object({
  status: OneOnOneStatusEnum.optional(),
});

export type TUpdateOneOnOneInput = z.infer<typeof UpdateOneOnOneInput>;
