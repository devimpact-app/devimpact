import { z } from 'zod';

export const SignalEntityTypeSchema = z.enum(['pull_request', 'review']);

export type SignalEntityType = z.infer<typeof SignalEntityTypeSchema>;

export const SignalRelatedItemSchema = z.object({
  id: z.string(),
  entityType: SignalEntityTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  htmlUrl: z.string().optional(),
  occurredAt: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

export type SignalRelatedItem = z.infer<typeof SignalRelatedItemSchema>;

export const SignalKindSchema = z.enum([
  'multiple_review_rounds',
  'slow_first_review',
  'large_change',
  'long_idle_gap',
]);

export type SignalKind = z.infer<typeof SignalKindSchema>;

export const SignalEvidenceSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z
    .enum([
      'hours',
      'days',
      'comments',
      'commits',
      'minutes',
      'count',
      'lines',
      'files',
    ])
    .optional(),
  threshold: z.number().optional(),
});
export type SignalEvidence = z.infer<typeof SignalEvidenceSchema>;

export const SignalSchema = z.object({
  id: z.string(),
  kind: SignalKindSchema,
  text: z.string(),
  severity: z.enum(['info', 'attention']).default('attention').optional(),
  evidence: z.array(SignalEvidenceSchema).default([]),
  relatedItem: SignalRelatedItemSchema.optional(),
  occurredAt: z.string().optional(),
});

export type Signal = z.infer<typeof SignalSchema>;
