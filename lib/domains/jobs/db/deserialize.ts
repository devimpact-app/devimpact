import { Job } from '@/lib/db/schema/jobs';

export type JobRowRaw = {
  id: string;
  tenant_id: string;
  kind: string;
  status: string;
  priority: number;
  next_run_at: Date;
  locked_at: Date | null;
  locked_by: string | null;
  dedupe_key: string;
  lock_expires_at: Date | null;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  last_error_at: Date | null;
  parent_job_id: string | null;
  payload: any;
  cursor: any;
  progress: any;
  result: any;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function deserializeJobRow(row: JobRowRaw): Job {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind as Job['kind'],
    status: row.status as Job['status'],
    priority: row.priority,
    nextRunAt: row.next_run_at,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    dedupeKey: row.dedupe_key,
    lockExpiresAt: row.lock_expires_at,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastError: row.last_error,
    lastErrorAt: row.last_error_at,
    parentJobId: row.parent_job_id,
    payload: row.payload ?? {},
    cursor: row.cursor ?? {},
    progress: row.progress ?? {},
    result: row.result ?? {},
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deserializeJobRows(input: any): Job[] {
  const rows = Array.isArray(input) ? input : (input?.rows ?? []);
  return rows.map(deserializeJobRow);
}
