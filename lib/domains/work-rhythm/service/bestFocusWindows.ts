import type {
  WorkRhythmBucket,
  BestFocusWindow,
  ProtectWindow,
} from '@/types/api/work-rhythm';
import { scoreBucketsForRhythm } from './scoring';
import { TIME_BAND_LABELS_SIMPLE } from './labels';

type WeekdayKey = WorkRhythmBucket['day'];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
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

  for (const { bucket, score, adjustments } of scored) {
    if (results.length >= maxWindows) break;

    // Slight bias: prefer spreading across days
    const alreadyUsedDay = usedDays.has(bucket.day);
    if (alreadyUsedDay && results.length < maxWindows - 1) {
      // skip this bucket for now to allow other days in; tweak as needed
      continue;
    }

    const dayLabel = WEEKDAY_LABELS[bucket.day];
    const bandLabel = TIME_BAND_LABELS_SIMPLE[bucket.band];
    results.push({
      day: bucket.day,
      band: bucket.band,
      score,
      label: `${dayLabel} ${bandLabel}`,
      workEventCount: adjustments?.workEventCount,
      meetingShare: adjustments?.meetingShare,
    });

    usedDays.add(bucket.day);
  }

  // If we skipped some due to day spreading and still have slots, fill them
  if (results.length < maxWindows) {
    for (const { bucket, score, adjustments } of scored) {
      if (results.length >= maxWindows) break;
      const exists = results.some(
        (w) => w.day === bucket.day && w.band === bucket.band
      );
      if (exists) continue;

      const dayLabel = WEEKDAY_LABELS[bucket.day];
      const bandLabel = TIME_BAND_LABELS_SIMPLE[bucket.band];

      results.push({
        day: bucket.day,
        band: bucket.band,
        score,
        label: `${dayLabel} ${bandLabel}`,
        workEventCount: adjustments?.workEventCount,
        meetingShare: adjustments?.meetingShare,
      });
    }
  }

  return results;
}
