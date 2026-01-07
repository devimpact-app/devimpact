import { z } from 'zod';
import { ThreadSummaryOutput } from './types';

export const ThreadSummaryOutputSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(4000),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1)).max(12),
  updates: z
    .object({
      headline: z.string().min(1).max(160).nullable(),
      bullets: z.array(z.string().min(1).max(220)).max(12).nullable(),
      referencedEventIds: z.array(z.string().min(1)).max(200),
    })
    .nullable(),
});

export function validateThreadSummaryOutput(
  raw: unknown,
  opts: {
    allowedEventIds: string[];
  }
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

  if (out.updates) {
    const allowed = new Set(opts.allowedEventIds);

    for (const id of out.updates.referencedEventIds) {
      if (!allowed.has(id)) {
        return { ok: false, error: `unknown_referenced_event_id:${id}` };
      }
    }

    const uniq = new Set(out.updates.referencedEventIds);
    if (uniq.size !== out.updates.referencedEventIds.length) {
      return { ok: false, error: 'duplicate_referenced_event_ids' };
    }
  }

  if (out.confidence >= 0.7 && out.reasons.length === 0) {
    return { ok: false, error: 'high_confidence_requires_reasons' };
  }

  return { ok: true, value: out };
}
