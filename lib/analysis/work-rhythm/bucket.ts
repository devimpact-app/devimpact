import { toLocalDateServer } from '@/lib/utils/server-date';
import type { ActivityEvent } from '@/types/api/timeline';
import {
  TimeBandKeySchema,
  WorkRhythmBucketSchema,
} from '@/types/api/work-rhythm';
import type {
  WeekdayKey,
  TimeBandKey,
  WorkRhythmBucket,
} from '@/types/api/work-rhythm';

const WEEKDAY_ORDER: WeekdayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

function getDayKey(date: Date): WeekdayKey {
  const jsDay = date.getDay(); // 0–6 (Sun–Sat)
  const idx = (jsDay + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  return WEEKDAY_ORDER[idx];
}

function getTimeBandKey(date: Date): TimeBandKey {
  const hour = date.getHours();

  if (hour < 6) return 'early'; // ~0–6
  if (hour < 12) return 'am'; // ~6–12
  if (hour < 18) return 'pm'; // ~12–18
  return 'eve'; // ~18–24
}

function classifyEventForRhythm(
  ev: ActivityEvent
): 'code' | 'review' | 'other' {
  switch (ev.kind) {
    case 'pr_commit':
    case 'pr_opened':
    case 'pr_merged':
      return 'code';
    case 'review_submitted':
      return 'review';
    default:
      return 'other';
  }
}

/**
 * Convert activity events into day × band buckets for Work Rhythm,
 * with counts for total events, code events, and review events.
 */
export function bucketEventsByDayAndBand(params: {
  events: ActivityEvent[];
  timezone: string;
}): {
  buckets: WorkRhythmBucket[];
  maxBucketCount: number;
} {
  const { events, timezone } = params;

  // Pre-initialize all day × band combos so FE can render a full grid
  const initialBuckets: WorkRhythmBucket[] = [];
  for (const day of WEEKDAY_ORDER) {
    for (const band of TimeBandKeySchema.options) {
      initialBuckets.push({
        day,
        band,
        eventCount: 0,
        codeEvents: 0,
        reviewEvents: 0,
      });
    }
  }

  // Index for fast lookup: key = `${day}:${band}`
  const bucketMap = new Map<string, WorkRhythmBucket>();
  for (const b of initialBuckets) {
    bucketMap.set(`${b.day}:${b.band}`, b);
  }

  // Fill buckets
  for (const ev of events) {
    if (!ev.occurredAt) continue;

    const date = toLocalDateServer(ev.occurredAt, timezone);
    if (isNaN(date.getTime())) continue;

    const day = getDayKey(date);
    const band = getTimeBandKey(date);
    const key = `${day}:${band}`;

    const bucket = bucketMap.get(key);
    if (!bucket) continue;

    bucket.eventCount += 1;

    const classification = classifyEventForRhythm(ev);
    if (classification === 'code') {
      bucket.codeEvents += 1;
    } else if (classification === 'review') {
      bucket.reviewEvents += 1;
    }
  }

  // Compute max bucket count for heatmap normalization
  let maxBucketCount = 0;
  const buckets = Array.from(bucketMap.values());

  for (const b of buckets) {
    if (b.eventCount > maxBucketCount) {
      maxBucketCount = b.eventCount;
    }
  }

  const parsed = buckets.map((b) => WorkRhythmBucketSchema.parse(b));
  return {
    buckets: parsed,
    maxBucketCount,
  };
}
