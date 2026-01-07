import { ThreadCategorySchema } from '@/types/api/threads';
import z from 'zod';
import {
  AssignThreadsOutput,
  CreateNewThread,
  NewThreadDescriptor,
} from './types';

const BaseAssignmentSchema = z.object({
  eventId: z.string().min(1),
  action: z.enum(['assign_existing', 'create_new', 'skip']),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1)).default([]),
});

const AssignExistingSchema = BaseAssignmentSchema.extend({
  action: z.literal('assign_existing'),
  threadId: z.string().min(1),
}).strict();

const CreateNewSchema = BaseAssignmentSchema.extend({
  action: z.literal('create_new'),
  newThreadKey: z.string().min(1),
}).strict();

const SkipSchema = BaseAssignmentSchema.extend({
  action: z.literal('skip'),
}).strict();

const ThreadAssignmentSchema = z.union([
  AssignExistingSchema,
  CreateNewSchema,
  SkipSchema,
]);

const NewThreadDescriptorSchema = z
  .object({
    newThreadKey: z.string().min(1),
    categoryKey: ThreadCategorySchema,
    title: z.string().min(1).max(120),
    confidence: z.number().min(0).max(1),
  })
  .strict();

const AssignThreadsOutputSchema = z
  .object({
    assignments: z.array(ThreadAssignmentSchema),
    newThreads: z.array(NewThreadDescriptorSchema),
  })
  .strict();

export type ValidateAssignThreadsOptions = {
  candidateEventIds: string[];
  existingThreadIds: string[];
  maxNewThreads?: number; // default 25
  minConfidenceForCreateNew?: number; // default 0.55
  minConfidenceForAssignExisting?: number; // default 0.4
};
export type ValidateAssignThreadsResult =
  | { ok: true; value: AssignThreadsOutput }
  | { ok: false; error: string; details?: any };

export function validateAssignThreadsOutput(
  raw: unknown,
  opts: ValidateAssignThreadsOptions
): ValidateAssignThreadsResult {
  const parsed = AssignThreadsOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid_schema',
      details: parsed.error.format(),
    };
  }

  const out = parsed.data;

  const candidateSet = new Set(opts.candidateEventIds);
  const threadSet = new Set(opts.existingThreadIds);

  const maxNewThreads = opts.maxNewThreads ?? 25;
  const minConfCreate = opts.minConfidenceForCreateNew ?? 0.55;
  const minConfAssign = opts.minConfidenceForAssignExisting ?? 0.4;

  const newThreadByKey = new Map<string, NewThreadDescriptor>();
  for (const nt of out.newThreads) {
    if (newThreadByKey.has(nt.newThreadKey)) {
      return {
        ok: false,
        error: 'duplicate_newThreadKey',
        details: { newThreadKey: nt.newThreadKey },
      };
    }
    newThreadByKey.set(nt.newThreadKey, nt);
  }

  if (out.newThreads.length > maxNewThreads) {
    return {
      ok: false,
      error: 'too_many_new_threads',
      details: { count: out.newThreads.length, maxNewThreads },
    };
  }

  const seenEventIds = new Set<string>();
  for (const a of out.assignments) {
    if (!candidateSet.has(a.eventId)) {
      return {
        ok: false,
        error: 'unknown_eventId',
        details: { eventId: a.eventId },
      };
    }

    if (seenEventIds.has(a.eventId)) {
      return {
        ok: false,
        error: 'duplicate_assignment_for_event',
        details: { eventId: a.eventId },
      };
    }
    seenEventIds.add(a.eventId);

    if (a.action === 'assign_existing') {
      if (!threadSet.has(a.threadId)) {
        return {
          ok: false,
          error: 'unknown_threadId',
          details: { eventId: a.eventId, threadId: a.threadId },
        };
      }
      if (a.confidence < minConfAssign) {
        return {
          ok: false,
          error: 'confidence_too_low_for_assign_existing',
          details: {
            eventId: a.eventId,
            confidence: a.confidence,
            minConfAssign,
          },
        };
      }
    }

    if (a.action === 'create_new') {
      if (!newThreadByKey.has(a.newThreadKey)) {
        return {
          ok: false,
          error: 'missing_newThreadDescriptor',
          details: { eventId: a.eventId, newThreadKey: a.newThreadKey },
        };
      }
      if (a.confidence < minConfCreate) {
        return {
          ok: false,
          error: 'confidence_too_low_for_create_new',
          details: {
            eventId: a.eventId,
            confidence: a.confidence,
            minConfCreate,
          },
        };
      }
    }
  }

  // ensure create_new keys are actually used by at least one assignment.
  const usedNewKeys = new Set(
    out.assignments
      .filter((a): a is CreateNewThread => a.action === 'create_new')
      .map((a) => a.newThreadKey)
  );

  for (const key of newThreadByKey.keys()) {
    if (!usedNewKeys.has(key)) {
      return {
        ok: false,
        error: 'unused_newThreadKey',
        details: { newThreadKey: key },
      };
    }
  }

  return { ok: true, value: out };
}
