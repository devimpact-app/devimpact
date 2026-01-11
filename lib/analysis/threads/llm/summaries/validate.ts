import { z } from 'zod';
import { ThreadSummaryOutput } from './types';

const BulletSchema = z
  .object({
    bulletId: z.string().nullable().optional(),
    sortIndex: z.number().int(),
    text: z.string().min(1).max(240),
    referencedEventIds: z.array(z.uuid()).max(50).default([]),
  })
  .strict();

export const ThreadSummaryOutputSchema = z.object({
  title: z.string().min(1).max(120),
  headline: z.string().min(1).max(220),
  bullets: z.array(BulletSchema).min(1).max(8),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1)).max(12),
  updates: z
    .object({
      headline: z.string().min(1).max(160).nullable(),
      bullets: z.array(z.string().min(1).max(220)).max(12).nullable(),
      referencedEventIds: z.array(z.string().min(1)).max(200),
      generatedAt: z.iso.datetime().optional(),
    })
    .nullable(),
});

export function validateThreadSummaryOutput(
  raw: unknown,
  opts: { allowedEventIds: string[] }
): { ok: true; value: ThreadSummaryOutput } | { ok: false; error: string } {
  const parsed = ThreadSummaryOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: `zod_validation_failed: ${parsed.error.issues
        .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join(' | ')}`,
    };
  }

  const out = parsed.data;
  const allowed = new Set(opts.allowedEventIds);

  for (let i = 0; i < out.bullets.length; i++) {
    const ids = out.bullets[i].referencedEventIds ?? [];

    const uniq = new Set(ids);
    if (uniq.size !== ids.length) {
      return {
        ok: false,
        error: `duplicate_referenced_event_ids:bullets[${i}]`,
      };
    }
  }

  if (out.updates?.referencedEventIds?.length) {
    const ids = out.updates.referencedEventIds;

    for (const id of ids) {
      if (!allowed.has(id)) {
        return {
          ok: false,
          error: `unknown_referenced_event_id:updates:${id}`,
        };
      }
    }

    const uniq = new Set(ids);
    if (uniq.size !== ids.length) {
      return { ok: false, error: 'duplicate_referenced_event_ids:updates' };
    }
  }

  if (out.confidence >= 0.7 && out.reasons.length === 0) {
    return { ok: false, error: 'high_confidence_requires_reasons' };
  }

  return { ok: true, value: out as ThreadSummaryOutput };
}
