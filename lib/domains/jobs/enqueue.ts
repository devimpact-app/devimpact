import { and, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Job, jobs } from '@/lib/db/schema/jobs';
import { JobKind, JobStatus } from '@/types/api/jobs';

function isJobSingletonViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as any).code === '23505' &&
    (err as any).constraint === 'jobs_singleton_active'
  );
}

export function hourlyDedupeKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  return `hour:${y}-${m}-${d}T${h}`;
}

export type EnqueueJobInput = {
  tenantId: string;
  kind: JobKind;
  dedupeKey: string;
  payload?: Record<string, unknown>;
  priority?: number;
  nextRunAt?: Date | string | null;
  maxAttempts?: number;
  parentJobId?: string | null;
};

export type EnqueueJobResult = {
  job: Job;
  created: boolean;
};

export async function enqueueJob(
  db: PostgresJsDatabase<any>,
  input: EnqueueJobInput
): Promise<EnqueueJobResult> {
  const {
    tenantId,
    kind,
    dedupeKey,
    payload = {},
    priority = 100,
    nextRunAt,
    maxAttempts = 5,
    parentJobId,
  } = input;

  const activeStatuses: JobStatus[] = ['queued', 'running'];

  const normalizedNextRunAt =
    nextRunAt == null
      ? new Date()
      : nextRunAt instanceof Date
        ? nextRunAt
        : new Date(nextRunAt);

  try {
    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.tenantId, tenantId),
          eq(jobs.kind, kind),
          eq(jobs.dedupeKey, dedupeKey),
          inArray(jobs.status, activeStatuses)
        )
      )
      .limit(1);

    if (existingJob) {
      return { job: existingJob, created: false };
    }

    const [job] = await db
      .insert(jobs)
      .values({
        tenantId,
        kind,
        dedupeKey,
        payload,
        priority,
        nextRunAt: normalizedNextRunAt,
        maxAttempts,
        parentJobId: parentJobId ?? null,
      })
      .returning();

    if (!job) {
      throw new Error('Failed to insert job (no row returned)');
    }

    return { job, created: true };
  } catch (err) {
    if (isJobSingletonViolation(err)) {
      const [fallbackJob] = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.tenantId, tenantId),
            eq(jobs.kind, kind),
            eq(jobs.dedupeKey, dedupeKey),
            inArray(jobs.status, activeStatuses)
          )
        )
        .limit(1);

      if (fallbackJob) {
        return { job: fallbackJob, created: false };
      }
    }

    throw err;
  }
}
