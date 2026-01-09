import { db } from '@/lib/db/client';
import {
  activityEvents,
  ThreadCategory,
  threadEvents,
  threads,
} from '@/lib/db/schema/activity';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { AssignThreadsOutput, ThreadAssignment } from '../llm/assign/types';
import { alias } from 'drizzle-orm/pg-core';

type PersistThreadAssignmentsArgs = {
  tenantId: string;
  candidateEvents: Array<{
    id: string;
    occurredAt: Date;
  }>;
  llmOutput: AssignThreadsOutput;
  assignedBy?: 'llm' | 'user' | 'heuristic';
  tx: typeof db;
};

export type PersistThreadAssignmentsResult = {
  createdThreads: Array<{
    id: string;
    categoryKey: ThreadCategory;
    title: string;
  }>;
  insertedThreadEvents: Array<{
    threadId: string;
    activityEventId: string;
  }>;
  skippedAlreadyThreaded: number;
};

function toReasonText(reasons: string[]): string {
  // thread_events.assignmentReason is a text field (not jsonb), so keep it compact.
  // If you want to preserve full fidelity later, change it to jsonb string[].
  return reasons.slice(0, 8).join(' | ');
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export async function persistThreadAssignments({
  tenantId,
  candidateEvents,
  llmOutput,
  assignedBy = 'llm',
}: PersistThreadAssignmentsArgs): Promise<PersistThreadAssignmentsResult> {
  const candidateIds = new Set(candidateEvents.map((e) => e.id));
  const occurredAtById = new Map(
    candidateEvents.map((e) => [e.id, e.occurredAt])
  );

  for (const a of llmOutput.assignments) {
    if (!candidateIds.has(a.eventId)) {
      throw new Error(
        `persistThreadAssignments: assignment references non-candidate eventId=${a.eventId}`
      );
    }
  }

  const newThreadKeys = new Set(
    llmOutput.newThreads.map((t) => t.newThreadKey)
  );
  for (const a of llmOutput.assignments) {
    if (a.action === 'create_new') {
      if (!newThreadKeys.has(a.newThreadKey)) {
        throw new Error(
          `persistThreadAssignments: create_new references missing newThreadKey=${a.newThreadKey}`
        );
      }
    }
  }

  return await db.transaction(async (tx) => {
    // Filter out events that are already threaded (uniq by tenantId+activityEventId)
    const existing = await tx
      .select({
        activityEventId: threadEvents.activityEventId,
      })
      .from(threadEvents)
      .where(
        and(
          eq(threadEvents.tenantId, tenantId),
          inArray(threadEvents.activityEventId, Array.from(candidateIds))
        )
      );

    const alreadyThreadedIds = new Set(existing.map((r) => r.activityEventId));
    const unthreadedAssignments = llmOutput.assignments.filter(
      (a) => !alreadyThreadedIds.has(a.eventId)
    );

    // If everything is already threaded, we’re done.
    if (unthreadedAssignments.length === 0) {
      return {
        createdThreads: [],
        insertedThreadEvents: [],
        skippedAlreadyThreaded: existing.length,
      };
    }

    // Create new threads referenced by assignments
    const usedNewThreadKeys = new Set(
      unthreadedAssignments
        .filter(
          (a): a is Extract<ThreadAssignment, { action: 'create_new' }> =>
            a.action === 'create_new'
        )
        .map((a) => a.newThreadKey)
    );

    const newThreadsToCreate = llmOutput.newThreads.filter((t) =>
      usedNewThreadKeys.has(t.newThreadKey)
    );

    // Compute first/lastActivityAt for each newThreadKey based on assigned events
    const rangeByNewKey = new Map<string, { first: Date; last: Date }>();
    for (const a of unthreadedAssignments) {
      if (a.action !== 'create_new') continue;
      const at = occurredAtById.get(a.eventId);
      if (!at) continue;

      const curr = rangeByNewKey.get(a.newThreadKey);
      if (!curr) {
        rangeByNewKey.set(a.newThreadKey, { first: at, last: at });
      } else {
        if (at < curr.first) curr.first = at;
        if (at > curr.last) curr.last = at;
      }
    }

    const createdThreads: PersistThreadAssignmentsResult['createdThreads'] = [];
    const newThreadIdByKey = new Map<string, string>();
    if (newThreadsToCreate.length > 0) {
      const inserted = await tx
        .insert(threads)
        .values(
          newThreadsToCreate.map((t) => {
            const range = rangeByNewKey.get(t.newThreadKey);
            return {
              tenantId,
              categoryKey: t.categoryKey as ThreadCategory,
              title: t.title,
              summary: '',
              confidence: clamp01(t.confidence),
              firstActivityAt: range?.first ?? null,
              lastActivityAt: range?.last ?? null,
            };
          })
        )
        .returning({
          id: threads.id,
          categoryKey: threads.categoryKey,
          title: threads.title,
        });

      for (let i = 0; i < inserted.length; i++) {
        const key = newThreadsToCreate[i]!.newThreadKey;
        const row = inserted[i];
        const threadId = row!.id;

        newThreadIdByKey.set(key, threadId);
        createdThreads.push(row);
      }
    }

    // Resolve final threadId for each unthreaded assignment (drop skips)
    const toInsert: Array<{
      tenantId: string;
      threadId: string;
      activityEventId: string;
      assignedBy: 'llm' | 'user' | 'heuristic';
      assignmentConfidence: number | null;
      assignmentReason: string | null;
    }> = [];

    for (const a of unthreadedAssignments) {
      if (a.action === 'skip') continue;

      let threadId: string | null = null;
      if (a.action === 'assign_existing') {
        // Either get the new thread or from existing
        threadId = newThreadIdByKey.get(a.threadId) ?? a.threadId;
      } else if (a.action === 'create_new') {
        threadId = newThreadIdByKey.get(a.newThreadKey) ?? null;
      }

      if (!threadId) {
        throw new Error(
          `persistThreadAssignments: could not resolve threadId for eventId=${a.eventId} action=${a.action}`
        );
      }

      toInsert.push({
        tenantId,
        threadId,
        activityEventId: a.eventId,
        assignedBy,
        assignmentConfidence: clamp01(a.confidence),
        assignmentReason: toReasonText(a.reasons),
      });
    }

    if (toInsert.length === 0) {
      return {
        createdThreads,
        insertedThreadEvents: [],
        skippedAlreadyThreaded: existing.length,
      };
    }

    // Insert join rows
    const insertedThreadEvents = await tx
      .insert(threadEvents)
      .values(toInsert)
      .onConflictDoNothing({
        target: [threadEvents.tenantId, threadEvents.activityEventId],
      })
      .returning({
        threadId: threadEvents.threadId,
        activityEventId: threadEvents.activityEventId,
      });

    // Update thread aggregates for affected threads
    // Recompute from activity_events via join for correctness
    const affectedThreadIds = Array.from(
      new Set(insertedThreadEvents.map((r) => r.threadId))
    );

    const te = alias(threadEvents, 'te');
    if (affectedThreadIds.length > 0) {
      await tx.execute(sql`
        UPDATE ${threads} t
        SET
          first_activity_at = agg.first_at,
          last_activity_at = agg.last_at
        FROM (
          SELECT
            te.thread_id AS thread_id,
            MIN(ae.occurred_at) AS first_at,
            MAX(ae.occurred_at) AS last_at
          FROM ${threadEvents} te
          JOIN ${activityEvents} ae
            ON ae.id = te.activity_event_id
           AND ae.tenant_id = te.tenant_id
          WHERE te.tenant_id = ${tenantId}
            AND ${inArray(te.threadId, affectedThreadIds)}
          GROUP BY te.thread_id
        ) agg
        WHERE t.id = agg.thread_id
          AND t.tenant_id = ${tenantId}
      `);
    }

    const skippedAlreadyThreaded = existing.length;

    return {
      createdThreads,
      insertedThreadEvents,
      skippedAlreadyThreaded,
    };
  });
}
