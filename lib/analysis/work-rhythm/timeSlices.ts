// 1. Slice definition - 15 mins intervals
// 2. Build slices - start, end, has Meeting, hasWork, and work activities, timezone - output the 15 min slices for that period
// 3. Focus windows - find blocks min 1 hour mins with low meeting share, with work activity
// 4. Deep work blocks - continuous 90+ min blocks with no meetings - available, has some work - utilized
// 5. Protect windows - rank windows by length, % meeting free, % used for week, preference for workday hours

import { CalendarEvent } from '@/lib/db/schema/gcal';
import { toDate } from '@/lib/utils/date';
import { ActivityEvent } from '@/types/api/timeline';
import { TimeSlice } from './types';
import { formatInTimeZone } from 'date-fns-tz';

const DEFAULT_SLICE_MINUTES = 15;
const MAX_RANGE_DAYS = 120;
const MAX_SLICES = 200_000;

export type BuildTimeSlicesParams = {
  startUtc: Date;
  endUtc: Date;
  meetingEvents: CalendarEvent[];
  workEvents: ActivityEvent[];
  sliceMinutes?: number;
  includePersonalMeetings?: boolean;
};

export function labelForWindow(startUtc: Date, endUtc: Date, tz: string) {
  // “Tuesday 9–11 AM”
  const day = formatInTimeZone(startUtc, tz, 'EEEE');
  const start = formatInTimeZone(startUtc, tz, 'h'); // 9
  const startAmPm = formatInTimeZone(startUtc, tz, 'a'); // AM
  const end = formatInTimeZone(endUtc, tz, 'h'); // 11
  const endAmPm = formatInTimeZone(endUtc, tz, 'a'); // AM

  // If AM/PM matches, only show once: “9–11 AM”
  const time =
    startAmPm === endAmPm
      ? `${start}–${end} ${endAmPm}`
      : `${start} ${startAmPm}–${end} ${endAmPm}`;

  return `${day} ${time}`;
}

function normalizeSliceMinutes(minutes?: number): number {
  const m = minutes ? Math.floor(minutes) : DEFAULT_SLICE_MINUTES;

  const allowed = new Set([5, 10, 15, 30, 60]);
  return allowed.has(m) ? m : DEFAULT_SLICE_MINUTES;
}

function floorToSliceBoundaryUtc(dateUtc: Date, sliceMinutes: number): Date {
  const ms = dateUtc.getTime();
  const sliceMs = sliceMinutes * 60_000;
  const floored = Math.floor(ms / sliceMs) * sliceMs;
  return new Date(floored);
}

function createEmptyTimeSlices(params: {
  alignedStartUtc: Date;
  alignedEndUtc: Date;
  sliceMinutes: number;
}): TimeSlice[] {
  const { alignedStartUtc, alignedEndUtc, sliceMinutes } = params;

  const sliceMs = sliceMinutes * 60_000;
  if (sliceMs <= 0) throw new Error('sliceMinutes must be > 0');

  const out: TimeSlice[] = [];

  let cursor = alignedStartUtc;
  let i = 0;

  while (cursor < alignedEndUtc) {
    if (i++ > MAX_SLICES) {
      throw new Error('Too many time slices (range too large)');
    }

    const next = new Date(cursor.getTime() + sliceMs);
    const end = next <= alignedEndUtc ? next : alignedEndUtc;

    // Safety: if for any reason we fail to advance, bail (prevents infinite loop)
    if (end.getTime() <= cursor.getTime()) {
      throw new Error('Time slice loop did not advance');
    }

    out.push({
      startUtc: cursor,
      endUtc: end,
      durationMinutes: Math.round((end.getTime() - cursor.getTime()) / 60_000),
      hasMeeting: false,
      hasWork: false,
      eventCount: 0,
    });

    cursor = end;
  }

  return out;
}

function findSliceIndex(slices: TimeSlice[], t: Date): number {
  let lo = 0,
    hi = slices.length - 1,
    ans = slices.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (slices[mid].endUtc > t) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
}

function applyMeetingsToSlices(slices: TimeSlice[], meetings: CalendarEvent[]) {
  if (!slices.length || !meetings.length) return;
  // TODO: filter out personal??
  for (const m of meetings) {
    const s = m.startAt;
    const e = m.endAt;
    if (!s || !e || !(s < e)) continue;

    let i = findSliceIndex(slices, s);
    if (i >= slices.length) continue;

    // mark all slices that overlap [s, e)
    while (i < slices.length && slices[i].startUtc < e) {
      // overlap check (should be true by construction, but keep it safe)
      if (slices[i].endUtc > s) {
        slices[i].hasMeeting = true;
      }
      i++;
    }
  }
}

function applyWorkEventsToSlices(params: {
  slices: TimeSlice[];
  workEvents: ActivityEvent[];
  alignedStartUtc: Date;
  sliceMinutes: number; // 15
}) {
  const { slices, workEvents, alignedStartUtc, sliceMinutes } = params;
  if (!slices.length || !workEvents.length) return;

  const startMs = alignedStartUtc.getTime();
  const sliceMs = sliceMinutes * 60_000;

  for (const ev of workEvents) {
    const t = toDate(ev.occurredAt);
    if (!t) continue;

    const delta = t.getTime() - startMs;
    if (delta < 0) continue;

    const idx = Math.floor(delta / sliceMs);
    if (idx < 0 || idx >= slices.length) continue;

    slices[idx].hasWork = true;
    slices[idx].eventCount += 1;
  }
}

export function buildTimeSlices(params: BuildTimeSlicesParams): TimeSlice[] {
  const { startUtc, endUtc } = params;

  if (!(startUtc < endUtc)) {
    throw new Error('buildTimeSlices: startUtc must be < endUtc');
  }
  const rangeMs = endUtc.getTime() - startUtc.getTime();
  const maxRangeMs = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (rangeMs > maxRangeMs) {
    throw new Error(
      `buildTimeSlices: range too large (>${MAX_RANGE_DAYS} days)`
    );
  }

  const sliceMinutes = normalizeSliceMinutes(params.sliceMinutes);
  const alignedStartUtc = floorToSliceBoundaryUtc(startUtc, sliceMinutes);
  const alignedEndUtc = endUtc;

  const timeSlices = createEmptyTimeSlices({
    alignedStartUtc,
    alignedEndUtc,
    sliceMinutes,
  });

  applyMeetingsToSlices(timeSlices, params.meetingEvents);
  applyWorkEventsToSlices({
    slices: timeSlices,
    workEvents: params.workEvents,
    alignedStartUtc,
    sliceMinutes,
  });

  return timeSlices;
}
