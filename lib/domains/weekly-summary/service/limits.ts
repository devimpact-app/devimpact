export const WEEKLY_SUMMARY_LIMITS = {
  maxThreads: 12,
  maxEventsPerThread: 10,
  maxNotableUnthreadedEvents: 10,
  maxBullets: 6,
  maxThreadsPerCategory: 5,
} as const;

export type WeeklySummaryLimits = Partial<typeof WEEKLY_SUMMARY_LIMITS>;
