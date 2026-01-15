import { subDays } from 'date-fns';
import { ActivityEvent } from '@/types/api/timeline';
import { getActivityEventsForRange } from './getActivityEventsForRange';
import { ActivityQueryParams } from '../types';

export type GetRecentActivityEventsParams = {
  tenantId: string;
  limit?: number;
  includeMeetings?: boolean;
  initialLookbackDays?: number; // default 14
  maxLookbackDays?: number; // default 90
};

export async function getRecentActivityEvents({
  tenantId,
  limit = 10,
  includeMeetings = false,
  initialLookbackDays = 14,
  maxLookbackDays = 90,
}: GetRecentActivityEventsParams): Promise<ActivityEvent[]> {
  const now = new Date();
  const windows = [initialLookbackDays, 30, 60, maxLookbackDays].filter(
    (d, i, arr) => d <= maxLookbackDays && arr.indexOf(d) === i
  );

  for (const days of windows) {
    const start = subDays(now, days);
    const events = await getActivityEventsForRange({
      tenantId,
      start,
      end: now,
      limit,
      includeMeetings,
    } as ActivityQueryParams & { includeMeetings?: boolean });

    if (events.length >= Math.min(limit, 5)) {
      return events.slice(0, limit);
    }
    if (days === maxLookbackDays) return events.slice(0, limit);
  }

  return [];
}
