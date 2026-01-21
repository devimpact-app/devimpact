import { z } from 'zod';
import { jobKindEnum, jobStatusEnum } from '@/lib/db/schema/jobs';

export const JobKindSchema = z.enum(jobKindEnum.enumValues);
export type JobKind = z.infer<typeof JobKindSchema>;

export const JobStatusSchema = z.enum(jobStatusEnum.enumValues);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const EnqueueJobBodySchema = z
  .object({
    kind: JobKindSchema,
    dedupeKey: z.string().min(1).max(255),
    payload: z.record(z.string(), z.any()).optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    nextRunAt: z.iso.datetime().optional(),
    maxAttempts: z.number().int().min(1).max(20).optional(),
    parentJobId: z.uuid().optional(),
  })
  .strict();

export type EnqueueJobBody = z.infer<typeof EnqueueJobBodySchema>;

export const JobStatusQuerySchema = z.object({
  kind: JobKindSchema,
  dedupeKey: z.string().min(1).max(200).optional(),
});

export const JobRowSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  kind: JobKindSchema,
  status: JobStatusSchema,
  priority: z.number().int(),
  nextRunAt: z.iso.datetime(),
  lockedAt: z.iso.datetime().nullable().optional(),
  lockedBy: z.string().nullable().optional(),
  dedupeKey: z.string(),
  lockExpiresAt: z.iso.datetime().nullable().optional(),
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
  lastError: z.string().nullable().optional(),
  lastErrorAt: z.iso.datetime().nullable().optional(),
  parentJobId: z.uuid().nullable().optional(),
  payload: z.record(z.string(), z.any()),
  cursor: z.record(z.string(), z.any()),
  progress: z.record(z.string(), z.any()),
  result: z.record(z.string(), z.any()),
  startedAt: z.iso.datetime().nullable().optional(),
  finishedAt: z.iso.datetime().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type JobRow = z.infer<typeof JobRowSchema>;

export const JobPublicSchema = JobRowSchema.omit({
  tenantId: true,
  lockedBy: true,
});

export type JobPublic = z.infer<typeof JobPublicSchema>;

export const JobStatusResponseSchema = z.object({
  job: JobPublicSchema.nullable(),
});
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;

export const EnqueueJobResponseSchema = z.object({
  job: JobPublicSchema,
  created: z.boolean(),
});
export type EnqueueJobResponse = z.infer<typeof EnqueueJobResponseSchema>;
