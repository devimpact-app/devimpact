import { Job } from '@/lib/db/schema/jobs';
import { JobPublic } from '@/types/api/jobs';

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function serializeJobPublic(row: Job): JobPublic {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    priority: row.priority,
    nextRunAt: row.nextRunAt.toISOString(),
    lockedAt: iso(row.lockedAt),
    dedupeKey: row.dedupeKey,
    lockExpiresAt: iso(row.lockExpiresAt),
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError ?? null,
    lastErrorAt: iso(row.lastErrorAt),
    parentJobId: row.parentJobId ?? null,
    payload: (row.payload ?? {}) as Record<string, any>,
    cursor: (row.cursor ?? {}) as Record<string, any>,
    progress: (row.progress ?? {}) as Record<string, any>,
    result: (row.result ?? {}) as Record<string, any>,
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
