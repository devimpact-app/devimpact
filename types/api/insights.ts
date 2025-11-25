import { z } from 'zod';

export const InsightKindSchema = z.enum([
  'fast_loops',
  'friction_themes',
  'bottlenecks',
  // add more later…
]);

export type InsightKind = z.infer<typeof InsightKindSchema>;

// Stat chips under story
export const InsightStatSchema = z.object({
  label: z.string(),
  value: z.string(),
  tooltip: z.string().optional(),
});

export type InsightStat = z.infer<typeof InsightStatSchema>;

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

  // For scoring
  metrics: z.record(z.string(), z.any()).optional(),

  // Time window + debug metadata
  timeWindowLabel: z.string().optional(), // e.g. "Last 4 weeks"
  meta: z.record(z.string(), z.any()).optional(), // internal metrics for future use
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
