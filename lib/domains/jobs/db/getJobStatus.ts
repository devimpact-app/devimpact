import { and, desc, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { jobs, type Job } from '@/lib/db/schema/jobs';
import { JobKind } from '@/types/api/jobs';

export async function getJobStatusForTenant(
  db: PostgresJsDatabase<any>,
  args: { tenantId: string; kind: JobKind; dedupeKey?: string }
): Promise<Job | null> {
  const { tenantId, kind, dedupeKey } = args;

  const baseWhere = and(
    eq(jobs.tenantId, tenantId),
    eq(jobs.kind, kind),
    ...(dedupeKey ? [eq(jobs.dedupeKey, dedupeKey)] : [])
  );

  // Prefer active first
  const [active] = await db
    .select()
    .from(jobs)
    .where(and(baseWhere, inArray(jobs.status, ['queued', 'running'])))
    .orderBy(desc(jobs.updatedAt), desc(jobs.createdAt))
    .limit(1);

  if (active) return active;

  // Prefer latest succeeded next (for onboarding fast-path)
  const [latestSucceeded] = await db
    .select()
    .from(jobs)
    .where(and(baseWhere, eq(jobs.status, 'succeeded')))
    .orderBy(desc(jobs.finishedAt), desc(jobs.updatedAt), desc(jobs.createdAt))
    .limit(1);

  if (latestSucceeded) return latestSucceeded;

  // Otherwise latest (failed/cancelled/etc)
  const [latest] = await db
    .select()
    .from(jobs)
    .where(baseWhere)
    .orderBy(desc(jobs.finishedAt), desc(jobs.updatedAt), desc(jobs.createdAt))
    .limit(1);

  return latest ?? null;
}
