import { db } from '@/lib/db/client';
import { Job, jobs } from '@/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

function computeBackoffMs(attempts: number) {
  const base = 5_000; // 5s
  const cap = 5 * 60_000; // 5m
  const exp = Math.min(cap, base * Math.pow(2, Math.max(0, attempts - 1)));
  const jitter = Math.floor(Math.random() * 1_000); // 0-1s
  return exp + jitter;
}

export function clearLockFields() {
  return {
    lockedAt: null,
    lockedBy: null,
    lockExpiresAt: null,
  } as const;
}

export async function markSucceeded(
  jobId: string,
  patch?: {
    cursor?: Record<string, unknown>;
    progress?: Record<string, unknown>;
    result?: Record<string, unknown>;
  }
) {
  const now = new Date();
  await db
    .update(jobs)
    .set({
      status: 'succeeded',
      finishedAt: now,
      updatedAt: now,
      ...(patch?.cursor ? { cursor: patch.cursor } : {}),
      ...(patch?.progress ? { progress: patch.progress } : {}),
      ...(patch?.result ? { result: patch.result } : {}),
      ...clearLockFields(),
    })
    .where(eq(jobs.id, jobId));
}

export async function markRequeued(
  jobId: string,
  patch: {
    nextRunAt?: Date;
    cursor?: Record<string, unknown>;
    progress?: Record<string, unknown>;
    result?: Record<string, unknown>;
  }
) {
  const now = new Date();
  await db
    .update(jobs)
    .set({
      status: 'queued',
      nextRunAt: patch.nextRunAt ?? new Date(now.getTime() + 10_000), // default: 10s
      updatedAt: now,
      ...(patch.cursor ? { cursor: patch.cursor } : {}),
      ...(patch.progress ? { progress: patch.progress } : {}),
      ...(patch.result ? { result: patch.result } : {}),
      ...clearLockFields(),
    })
    .where(eq(jobs.id, jobId));
}

export async function markFailedNoRetry(job: Job, err: string) {
  await db
    .update(jobs)
    .set({
      status: 'failed',
      lastError: err,
      lastErrorAt: new Date(),
      finishedAt: new Date(),
      updatedAt: new Date(),
      ...clearLockFields(),
    })
    .where(eq(jobs.id, job.id));
}

export async function markFailedOrRetry(job: Job, err: unknown) {
  const now = new Date();
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Job error';

  const willExceedMax = job.attempts >= job.maxAttempts; // attempts already incremented on claim

  if (willExceedMax) {
    await db
      .update(jobs)
      .set({
        status: 'failed',
        lastError: message,
        lastErrorAt: now,
        finishedAt: now,
        updatedAt: now,
        ...clearLockFields(),
      })
      .where(eq(jobs.id, job.id));
    return { outcome: 'failed' as const, nextRunAt: null as Date | null };
  }

  const backoffMs = computeBackoffMs(job.attempts);
  const nextRunAt = new Date(now.getTime() + backoffMs);

  await db
    .update(jobs)
    .set({
      status: 'queued',
      nextRunAt,
      lastError: message,
      lastErrorAt: now,
      updatedAt: now,
      ...clearLockFields(),
    })
    .where(eq(jobs.id, job.id));

  return { outcome: 'retry' as const, nextRunAt };
}
