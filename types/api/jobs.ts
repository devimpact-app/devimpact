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
