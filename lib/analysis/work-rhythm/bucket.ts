import {
  getHourInTimezoneServer,
  getWeekdayInTimezoneServer,
  getYMDInTimezoneServer,
} from '@/lib/utils/server-date';
import { CalendarEvent } from '@/lib/db/schema/gcal';
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
import { fromZonedTime } from 'date-fns-tz';
import { addDays, format, parseISO } from 'date-fns';

const WEEKDAY_ORDER: WeekdayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

const BAND_MINUTES: Record<TimeBandKey, number> = {
  early: (9 - 5) * 60, // 240
  am: (12 - 9) * 60, // 180
  pm: (18 - 12) * 60, // 360
  eve: (29 - 18) * 60, // 660
};

function getDayKey(date: Date, tz: string): WeekdayKey {
  const idx = getWeekdayInTimezoneServer(date, tz);
  return WEEKDAY_ORDER[idx];
}

function getTimeBandKey(date: Date, tz: string): TimeBandKey {
  const h = getHourInTimezoneServer(date, tz);

  if (h >= 5 && h < 9) return 'early';
  if (h >= 9 && h < 12) return 'am';
  if (h >= 12 && h < 18) return 'pm';
  return 'eve';
}

export function bandEndHour(band: TimeBandKey): number {
  switch (band) {
    case 'eve':
      return 5;
    case 'early':
      return 9;
    case 'am':
      return 12;
    case 'pm':
      return 18;
  }
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

function createBucketByKeyMap(
  buckets: WorkRhythmBucket[]
): Map<string, WorkRhythmBucket> {
  const map = new Map<string, WorkRhythmBucket>();
  for (const b of buckets) {
    const key = `${b.day}:${b.band}`;
    map.set(key, b);
  }
  return map;
}

function addLocalDays(dateStrYYYYMMDD: string, days: number) {
  const d = parseISO(dateStrYYYYMMDD);
  return format(addDays(d, days), 'yyyy-MM-dd');
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getBandEnd(cursorUtc: Date, band: TimeBandKey, tz: string) {
  const endHour = bandEndHour(band);
  const localYMD = getYMDInTimezoneServer(cursorUtc, tz);
  const localHour = getHourInTimezoneServer(cursorUtc, tz);
  const endDateStr =
    endHour <= localHour ? addLocalDays(localYMD, 1) : localYMD;
  const localEnd = `${endDateStr}T${pad2(endHour)}:00:00`;
  return fromZonedTime(localEnd, tz);
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

  const bucketMap = createBucketByKeyMap(initialBuckets);
  for (const ev of events) {
    if (!ev.occurredAt) continue;

    const date = new Date(ev.occurredAt);
    if (isNaN(date.getTime())) continue;

    const day = getDayKey(date, timezone);
    const band = getTimeBandKey(date, timezone);
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

export function applyMeetingOverlay(params: {
  buckets: WorkRhythmBucket[];
  meetingEvents: CalendarEvent[];
  timezone: string;
}): WorkRhythmBucket[] {
  const { buckets, meetingEvents, timezone } = params;

  const bucketMap = createBucketByKeyMap(buckets);

  const shouldAttach = meetingEvents.length > 0;
  if (!shouldAttach) return buckets;

  // Clone buckets
  const out: WorkRhythmBucket[] = buckets.map((b) => {
    if (!shouldAttach) return { ...b };
    const bandMinutes = BAND_MINUTES[b.band as keyof typeof BAND_MINUTES] ?? 0;
    return {
      ...b,
      meetings: {
        bandMinutes,
        meetingMinutes: 0,
        meetingCount: 0,
        meetingShare: 0,
      },
    };
  });
  const outByKey = new Map<string, WorkRhythmBucket>();
  for (const b of out) outByKey.set(`${b.day}:${b.band}`, b);

  for (const ev of meetingEvents) {
    if (ev.isAllDay) continue;

    const startUtc = new Date(ev.startAt);
    const endUtc = new Date(ev.endAt);
    if (!(startUtc < endUtc)) continue;

    let cursorUtc = startUtc;

    const touchedBuckets = new Set<string>();

    while (cursorUtc < endUtc) {
      const day = getDayKey(cursorUtc, timezone);
      const band = getTimeBandKey(cursorUtc, timezone);

      const bandEndUtc = getBandEnd(cursorUtc, band, timezone);
      const segmentEndUtc = bandEndUtc < endUtc ? bandEndUtc : endUtc;

      const minutes = Math.max(
        0,
        Math.round((segmentEndUtc.getTime() - cursorUtc.getTime()) / 60000)
      );
      if (minutes > 0) {
        const key = `${day}:${band}`;
        const cur = outByKey.get(key);
        if (!cur) throw new Error('Missing bucket in meeting overlay');

        let meetingData = cur.meetings ?? {
          meetingCount: 0,
          meetingMinutes: 0,
          meetingShare: 0,
          bandMinutes: BAND_MINUTES[cur.band],
        };
        meetingData.meetingMinutes += minutes;

        if (!touchedBuckets.has(key)) {
          meetingData.meetingCount += 1;
          touchedBuckets.add(key);
        }

        outByKey.set(key, cur);
      }

      cursorUtc = segmentEndUtc;
    }
  }

  // Add meeting share
  for (const bucket of out) {
    if (bucket.meetings && bucket.meetings.meetingMinutes > 0) {
      bucket.meetings.meetingShare = Math.min(
        1,
        bucket.meetings.meetingMinutes / bucket.meetings.bandMinutes
      );
    }
  }

  return out;
}
