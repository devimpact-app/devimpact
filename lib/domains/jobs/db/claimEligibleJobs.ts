import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { jobs } from '@/lib/db/schema/jobs';

export async function claimEligibleJobs(
  db: PostgresJsDatabase<any>,
  opts: {
    limit: number;
    dispatcherId: string;
    lockTtlMs: number;
  }
): Promise<(typeof jobs.$inferSelect)[]> {
  const { limit, dispatcherId, lockTtlMs } = opts;

  const q = sql`
    WITH candidate AS (
      SELECT id
      FROM ${jobs}
      WHERE
        (
          ${jobs.status} = 'queued'
          AND ${jobs.nextRunAt} <= now()
        )
        OR
        (
          ${jobs.status} = 'running'
          AND ${jobs.lockExpiresAt} IS NOT NULL
          AND ${jobs.lockExpiresAt} <= now()
        )
      AND ${jobs.attempts} < ${jobs.maxAttempts}
      ORDER BY ${jobs.priority} ASC, ${jobs.nextRunAt} ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE ${jobs} j
    SET
      status = 'running',
      locked_at = now(),
      locked_by = ${dispatcherId},
      lock_expires_at = now() + (${lockTtlMs} * interval '1 millisecond'),
      attempts = j.attempts + 1,
      started_at = COALESCE(j.started_at, now()),
      updated_at = now()
    FROM candidate
    WHERE j.id = candidate.id
    RETURNING j.*;
  `;

  const res: any = await db.execute(q);

  return (res?.rows ?? res) as (typeof jobs.$inferSelect)[];
}
