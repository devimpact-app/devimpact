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

  return { ok: true, value: out as ThreadSummaryOutput };
}
