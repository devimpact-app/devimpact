import z from 'zod';
import type { WeeklySummaryOutput } from './types';

const WeeklySummaryBulletSchema = z
  .object({
    text: z.string().min(1).max(240),
    referencedThreadIds: z.array(z.uuid()).min(0).max(20).optional(),
    referencedEventIds: z.array(z.uuid()).min(0).max(50).optional(),
  })
  .strict();

export const WeeklySummaryOutputSchema = z
  .object({
    headline: z.string().min(1).max(220),
    bullets: z.array(WeeklySummaryBulletSchema).max(12),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export type ValidateWeeklySummaryOptions = {
  allowedThreadIds: string[];
  allowedEventIds: string[];
};

export type ValidateWeeklySummaryResult =
  | { ok: true; value: WeeklySummaryOutput }
  | { ok: false; error: string; details?: any };

function hasDupes(arr: string[]) {
  return new Set(arr).size !== arr.length;
}

export function validateWeeklySummaryOutput(
  raw: unknown,
  opts: ValidateWeeklySummaryOptions
): ValidateWeeklySummaryResult {
  const parsed = WeeklySummaryOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid_schema',
      details: parsed.error.format(),
    };
  }

  const out = parsed.data;

  const threadSet = new Set(opts.allowedThreadIds);
  const eventSet = new Set(opts.allowedEventIds);

  for (let i = 0; i < out.bullets.length; i++) {
    const b = out.bullets[i];
    const threadIds = b.referencedThreadIds ?? [];
    const eventIds = b.referencedEventIds ?? [];

    // if (threadIds.length === 0 && eventIds.length === 0) {
    //   return {
    //     ok: false,
    //     error: 'bullet_missing_references',
    //     details: { bulletIndex: i },
    //   };
    // }

    if (hasDupes(threadIds)) {
      return {
        ok: false,
        error: 'duplicate_referencedThreadIds',
        details: { bulletIndex: i },
      };
    }
    if (hasDupes(eventIds)) {
      return {
        ok: false,
        error: 'duplicate_referencedEventIds',
        details: { bulletIndex: i },
      };
    }

    for (const id of threadIds) {
      if (!threadSet.has(id)) {
        return {
          ok: false,
          error: 'unknown_referenced_thread_id',
          details: { bulletIndex: i, threadId: id },
        };
      }
    }

    for (const id of eventIds) {
      if (!eventSet.has(id)) {
        return {
          ok: false,
          error: 'unknown_referenced_event_id',
          details: { bulletIndex: i, eventId: id },
        };
      }
    }
  }

  return { ok: true, value: out as WeeklySummaryOutput };
}
