import { z } from 'zod';

export const InsightTransparencySchema = z.object({
  summary: z.string(),
  bullets: z.array(z.string()).optional(),
  thresholds: z
    .array(
      z.object({
        key: z.string(), // e.g. "improvementRatio"
        label: z.string(), // "Improvement ratio"
        actual: z.number(), // e.g. 2.1
        condition: z.string(), // ">= 1.3 & ≥ 2h difference"
      })
    )
    .optional(),
});

// Stat chips - primary go in card, all others go in right detail view only
export const InsightStatSchema = z.object({
  label: z.string(),
  value: z.string(),
  tooltip: z.string().optional(),
  importance: z.enum(['primary', 'secondary']).optional().default('primary'),
});

export type InsightStat = z.infer<typeof InsightStatSchema>;

export const InsightRelatedItemSchema = z.object({
  id: z.string(),
  entityType: z.enum(['pull_request', 'review']),
  title: z.string(),
  htmlUrl: z.string().optional(),
  subtitle: z.string().optional(),
  /**
   * Insight-specific chips for this item
   * e.g. "Cycle time 18.2h", "Theme: architecture", "Delay: +6.1h"
   */
  stats: z.array(InsightStatSchema).default([]),
  meta: z.record(z.string(), z.any()).optional(),
});

export type InsightRelatedItem = z.infer<typeof InsightRelatedItemSchema>;

export const InsightKindSchema = z.enum([
  'fast_loops',
  'friction_themes',
  'bottlenecks',
  // add more later…
]);

export type InsightKind = z.infer<typeof InsightKindSchema>;

export const InsightSchema = z.object({
  id: z.string(), // e.g. "fast_loops:2024-11-25"
  kind: InsightKindSchema,

  title: z.string(), // "Your small morning PRs merge 2.4× faster"
  body: z.string().optional(), // longer explanation if needed
  emphasis: z.string().optional(), // e.g. "2.4× faster than your baseline"

  // Visual helpers
  stats: z.array(InsightStatSchema).default([]),
  severity: z.enum(['info', 'positive', 'warning', 'critical']).default('info'),

  // Ranking
  score: z.number().min(0).max(100),

  // Time window + debug metadata
  timeWindowLabel: z.string().optional(), // e.g. "Last 4 weeks"
  meta: z.record(z.string(), z.any()).optional(), // internal metrics for future use

  relatedItems: z.array(InsightRelatedItemSchema).optional(),
  transparency: InsightTransparencySchema.optional(),
});

export type Insight = z.infer<typeof InsightSchema>;

export const InsightsResponseSchema = z.object({
  insights: z.array(InsightSchema),
  meta: z.object({
    windowStartISO: z.string(),
    windowEndISO: z.string(),
    generatedAt: z.string(),
  }),
});

export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;
