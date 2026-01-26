import { Job } from '@/lib/db/schema/jobs';
import { EnqueueJobBody } from '@/types/api/jobs';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type JobHandlerInput = {
  job: Job;
  now: Date;
  db: PostgresJsDatabase<any>;
  dispatcherId: string;
};

export type JobHandlerResult =
  | {
      outcome: 'complete';
      result?: Record<string, unknown>;
      progress?: Record<string, unknown>;
      cursor?: Record<string, unknown>;
    }
  | {
      outcome: 'requeue';
      cursor?: Record<string, unknown>;
      progress?: Record<string, unknown>;
      result?: Record<string, unknown>;
      nextRunAt?: Date;
      enqueue?: Array<EnqueueJobBody>;
    };
