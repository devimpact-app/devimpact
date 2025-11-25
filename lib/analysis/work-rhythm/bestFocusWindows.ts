import type {
  WorkRhythmBucket,
  BestFocusWindow,
  ProtectWindow,
} from '@/types/api/work-rhythm';
import { scoreBucketsForRhythm } from './scoring';

type WeekdayKey = WorkRhythmBucket['day'];
type TimeBandKey = WorkRhythmBucket['band'];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const BAND_LABELS: Record<TimeBandKey, string> = {
  early: 'early morning',
  am: '9–12 AM',
  pm: '12–5 PM',
  eve: 'evening',
};

export function computeBestFocusWindows(params: {
  buckets: WorkRhythmBucket[];
  maxWindows?: number;
}): BestFocusWindow[] {
  const { buckets, maxWindows = 3 } = params;

  const scored = scoreBucketsForRhythm(buckets);
  if (scored.length === 0) return [];

  const results: BestFocusWindow[] = [];
  const usedDays = new Set<WeekdayKey>();

  for (const { bucket, score } of scored) {
    if (results.length >= maxWindows) break;

    // Slight bias: prefer spreading across days
    const alreadyUsedDay = usedDays.has(bucket.day);
    if (alreadyUsedDay && results.length < maxWindows - 1) {
      // skip this bucket for now to allow other days in; tweak as needed
      continue;
    }

    const dayLabel = WEEKDAY_LABELS[bucket.day];
    const bandLabel = BAND_LABELS[bucket.band];
    results.push({
      day: bucket.day,
      band: bucket.band,
      score,
      label: `${dayLabel} ${bandLabel}`,
    });

    usedDays.add(bucket.day);
  }

  // If we skipped some due to day spreading and still have slots, fill them
  if (results.length < maxWindows) {
    for (const { bucket, score } of scored) {
      if (results.length >= maxWindows) break;
      const exists = results.some(
        (w) => w.day === bucket.day && w.band === bucket.band
      );
      if (exists) continue;

      const dayLabel = WEEKDAY_LABELS[bucket.day];
      const bandLabel = BAND_LABELS[bucket.band];

      results.push({
        day: bucket.day,
        band: bucket.band,
        score,
        label: `${dayLabel} ${bandLabel}`,
      });
    }
  }

  return results;
}

export function computeProtectWindows(params: {
  buckets: WorkRhythmBucket[];
  maxWindows?: number;
}): ProtectWindow[] {
  const { buckets, maxWindows = 2 } = params;

  const best = computeBestFocusWindows({ buckets, maxWindows: 4 });
  if (best.length === 0) return [];

  const weekdaySet: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const nonEvening: TimeBandKey[] = ['early', 'am', 'pm'];

  const primary = best.filter(
    (w) => weekdaySet.includes(w.day) && nonEvening.includes(w.band)
  );

  const picked: ProtectWindow[] = [];
  for (const w of primary) {
    if (picked.length >= maxWindows) break;
    picked.push({
      day: w.day,
      band: w.band,
      // Make this more relevant for meeting times
      label: w.label.replace('early morning', '9–11 AM'),
    });
  }

  if (picked.length === 0) {
    for (const w of best) {
      if (picked.length >= maxWindows) break;
      picked.push({
        day: w.day,
        band: w.band,
        label: w.label,
      });
    }
  }

  return picked;
}
