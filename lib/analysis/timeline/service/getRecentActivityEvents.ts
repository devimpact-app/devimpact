import { subDays } from 'date-fns';
import { ActivityEvent } from '@/types/api/timeline';
import { getActivityEventsForRange } from './getActivityEventsForRange';
import { ActivityQueryParams } from '../types';

export type GetRecentActivityEventsParams = {
  tenantId: string;
  limit?: number;
  includeMeetings?: boolean;
  lookbackDays?: number; // default 28
};

export async function getRecentActivityEvents({
  tenantId,
  limit = 10,
  includeMeetings = false,
  lookbackDays = 28,
}: GetRecentActivityEventsParams): Promise<ActivityEvent[]> {
  const now = new Date();
  const start = subDays(now, lookbackDays);
  const events = await getActivityEventsForRange({
    tenantId,
    start,
    end: now,
    limit,
    includeMeetings,
  } as ActivityQueryParams & { includeMeetings?: boolean });

  return events;
}
