import { z } from 'zod';

export const WeekRangeSchema = z.object({
  startISO: z.string(),
  endISO: z.string(),
  label: z.string(), // e.g. "Last week · Oct 14–18"
});

export const StatsSchema = z
  .object({
    prsAuthored: z.number().int().nonnegative(),
    prsReviewed: z.number().int().nonnegative(),
    activeDays: z.number().int().nonnegative(),
    mostActiveDay: z
      .enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
      .optional(),
  })
  .catchall(z.any());

export const PRReferenceSchema = z.object({
  prId: z.string(),
  repo: z.string().optional(),
  number: z.number().int().optional(),
  title: z.string(),
  htmlUrl: z.string(),
});

export const ShippedItemSchema = PRReferenceSchema.extend({
  shortSummary: z.string(), // from LLM
  tags: z.array(z.string()).default([]), // "feature-x", "infra", "tests"
}).catchall(z.any());

export const HighlightedReviewSchema = PRReferenceSchema.extend({
  shortSummary: z.string(), // from LLM
  tags: z.array(z.string()).default([]), // "architecture", "tests"
}).catchall(z.any());

export const ReviewsCollabSchema = z
  .object({
    totalReviewed: z.number().int().nonnegative(),
    firstResponderCount: z.number().int().nonnegative(),
    highlightedReview: HighlightedReviewSchema.optional(),
    // Future fields: reviewLatencyStats, crossTeamCount, etc.
  })
  .catchall(z.any());

export const WhatYouWorkedOnSchema = z
  .object({
    // Optional short narrative, e.g.
    // "Most of your work was in auth, billing, and infra refactors."
    textSummary: z.string().optional(),

    // Domains / skills / systems you touched.
    // Think: "auth", "billing", "infra", "tests", "frontend"
    focusAreas: z.array(z.string()).default([]),
  })
  .catchall(z.any());

const FrictionItemBaseSchema = z.object({
  id: z.string().optional(), // for stable keys in the UI
  text: z.string(), // user-facing sentence
  relatedPr: PRReferenceSchema.optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
});

export const FrictionItemSchema = z.discriminatedUnion('kind', [
  FrictionItemBaseSchema.extend({
    kind: z.literal('iteration'), // multi-round changes, back-and-forth
    // Future: fields like iterationCount, rounds, etc.
  }),
  FrictionItemBaseSchema.extend({
    kind: z.literal('latency'), // slow reviews / waits
    // Future: fields like waitTimeHours, phase ("pre-review", "post-review")
  }),
  FrictionItemBaseSchema.extend({
    kind: z.literal('theme'), // recurring feedback theme
    themeTags: z.array(z.string()).default([]), // "tests", "architecture"
  }),
  FrictionItemBaseSchema.extend({
    kind: z.literal('other'), // for anything that doesn't fit yet
  }),
]);

export const FrictionFollowupsSchema = z
  .object({
    items: z.array(FrictionItemSchema).default([]),
  })
  .catchall(z.any());

export const WeeklySummarySchema = z
  .object({
    version: z.literal(1).default(1),

    range: WeekRangeSchema,

    headline: z.string(),

    softStats: StatsSchema,

    shipped: z.array(ShippedItemSchema).default([]),

    reviewsCollab: ReviewsCollabSchema.optional(),

    whatYouWorkedOn: WhatYouWorkedOnSchema.optional(),

    frictionFollowups: FrictionFollowupsSchema.optional(),

    meta: z
      .object({
        generatedAt: z.string().datetime(),
        rangeKey: z.string(),
      })
      .optional(),
  })
  // Allow additional top-level keys in future without breaking older clients
  .catchall(z.any());

export type WeeklySummary = z.infer<typeof WeeklySummarySchema>;
