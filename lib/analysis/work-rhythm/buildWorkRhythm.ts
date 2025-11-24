import {
  WorkRhythm,
  WorkRhythmBucket,
  WorkRhythmSchema,
} from '@/types/api/work-rhythm';
import { formatRange, getTimelineRangeBounds } from '@/lib/utils/date';
import { getActivityEventsForRange } from '../activity/getActivityEventsForRange';
import { bucketEventsByDayAndBand } from './bucket';
import {
  computeBestFocusWindows,
  computeProtectWindows,
} from './bestFocusWindows';
import { computeAvgDeepWorkBlocksPerWeek } from './deepWork';
import { buildWorkRhythmDescription } from './description';

export type BuildWorkRhythmArgs = {
  userId: string;
  timezone: string;
};

function computeEveningSharePercent(buckets: WorkRhythmBucket[]): number {
  if (!buckets.length) return 0;

  let totalEvents = 0;
  let eveningEvents = 0;

  for (const b of buckets) {
    totalEvents += b.eventCount;
    if (b.band === 'eve') {
      eveningEvents += b.eventCount;
    }
  }

  if (totalEvents === 0) return 0;

  const raw = (eveningEvents / totalEvents) * 100;
  return Math.round(raw);
}

/**
 * Main orchestrator for Work Rhythm analysis.
 * Produces the heatmap buckets + derived weekly pattern insights.
 */
export async function buildWorkRhythm({
  userId,
  timezone,
}: BuildWorkRhythmArgs): Promise<WorkRhythm> {
  const { start, end } = getTimelineRangeBounds('4w');
  const range: WorkRhythm['range'] = {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: formatRange(start, end),
  };

  const events = await getActivityEventsForRange({
    tenantId: userId,
    start,
    end,
  });

  const { buckets, maxBucketCount } = bucketEventsByDayAndBand({
    events,
    timezone,
  });

  const bestFocusWindows = computeBestFocusWindows({
    buckets,
  });

  const avgDeepWorkBlocksPerWeek = computeAvgDeepWorkBlocksPerWeek({
    buckets,
  });

  const eveningSharePercent = computeEveningSharePercent(buckets);

  const protectWindows = computeProtectWindows({
    buckets,
  });

  const summary = {
    description: buildWorkRhythmDescription({
      bestFocusWindows,
      avgDeepWorkBlocksPerWeek,
      eveningSharePercent,
    }),
    bestFocusWindows,
    avgDeepWorkBlocksPerWeek,
    eveningSharePercent,
    protectWindows,
  };

  const analysis: WorkRhythm = {
    version: 1,
    range,
    buckets,
    maxBucketCount,
    summary,
  };

  return WorkRhythmSchema.parse(analysis);
}
