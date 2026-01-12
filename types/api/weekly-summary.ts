import z from 'zod';

export const WeeklySummaryStatusSchema = z.enum([
  'pending', // queued / created but not started
  'generating', // in-flight
  'ready', // generated successfully
  'failed', // errored
  'skipped', // intentionally skipped (e.g., no data)
]);
export type WeeklySummaryStatus = z.infer<typeof WeeklySummaryStatusSchema>;
