import z from 'zod';

export const WeeklySummaryStatusSchema = z.enum([
  'pending', // queued / created but not started
  'generating', // in-flight
  'ready', // generated successfully
  'failed', // errored
  'skipped', // intentionally skipped (e.g., no data)
]);
export type WeeklySummaryStatus = z.infer<typeof WeeklySummaryStatusSchema>;

export const LocalDateIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const WeeklySummaryBulletSchema = z
  .object({
    text: z.string().min(1).max(280),
    referencedThreadIds: z.array(z.string().uuid()).max(50).optional(),
    referencedEventIds: z.array(z.string().uuid()).max(200).optional(),
  })
  .strict();

export const WeeklySummaryOutputSchema = z
  .object({
    headline: z.string().min(1).max(220),
    bullets: z.array(WeeklySummaryBulletSchema).max(12),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export const WeeklySummaryItemSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    weekStartLocalDate: LocalDateIsoSchema,
    timezone: z.string(),
    rangeStartUtc: z.iso.datetime(),
    rangeEndUtc: z.iso.datetime(),
    status: WeeklySummaryStatusSchema,
    generationStartedAt: z.string().datetime().nullable().optional(),
    lastError: z.string().nullable().optional(),
    lastErrorAt: z.iso.datetime().nullable().optional(),
    claimedAt: z.iso.datetime().nullable().optional(),
    claimedBy: z.string().nullable().optional(),
    claimExpiresAt: z.iso.datetime().nullable().optional(),
    attempts: z.number().int().min(0),
    nextAttemptAt: z.iso.datetime().nullable().optional(),
    emailedAt: z.iso.datetime().nullable().optional(),
    output: WeeklySummaryOutputSchema.nullable(),
    referencedThreadIds: z.array(z.uuid()).max(500).default([]),
    referencedEventIds: z.array(z.uuid()).max(2000).default([]),
    model: z.string().max(120).nullable().optional(),
    promptVersion: z.string().max(120).nullable().optional(),
    generatedAt: z.iso.datetime().nullable().optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type WeeklySummaryItem = z.infer<typeof WeeklySummaryItemSchema>;

export const RunWeeklySummaryRequestSchema = z
  .object({
    weekStartIso: LocalDateIsoSchema.optional(),
    timezone: z.string().optional(),
    force: z.boolean().optional(),
  })
  .strict();

export type RunWeeklySummaryRequest = z.infer<
  typeof RunWeeklySummaryRequestSchema
>;

export const RunWeeklySummaryActionSchema = z.enum([
  'proceed',
  'return_existing',
  'skip_in_progress',
  'skip',
  'skip_error',
]);

export const RunWeeklySummaryReasonSchema = z.enum([
  // proceed
  'created',
  'reusing_pending',
  'force_reprocess',
  'recovered_expired_processing',
  'retrying_error',

  // return_existing
  'already_ready',
  'already_sent',

  // skip_in_progress
  'processing_claim_active',

  // skip
  'already_skipped',

  // skip_error
  'error_backoff',
  'error_max_attempts',
]);

export const RunWeeklySummaryResponseSchema = z
  .object({
    action: RunWeeklySummaryActionSchema,
    reason: RunWeeklySummaryReasonSchema,
    processed: z.boolean(),
    weeklySummary: WeeklySummaryItemSchema,
    retryAfterMs: z.number().int().min(0).optional(),
  })
  .strict();

export type RunWeeklySummaryResponse = z.infer<
  typeof RunWeeklySummaryResponseSchema
>;

export const GetWeeklySummariesResponseSchema = z
  .object({
    items: z.array(WeeklySummaryItemSchema),
    nextCursor: z.string().nullable().optional(),
  })
  .strict();

export type GetWeeklySummariesResponse = z.infer<
  typeof GetWeeklySummariesResponseSchema
>;
