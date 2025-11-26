export const MAX_HOURS_CUTOFF = 24 * 14; // clamp at 14 days

export type TimeOfDayBucket =
  | 'early_morning'
  | 'morning'
  | 'afternoon'
  | 'evening';

export function getTimeOfDayBucket(hour: number): TimeOfDayBucket {
  if (hour < 8) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function formatTimeOfDayLabel(bucket: TimeOfDayBucket): string {
  switch (bucket) {
    case 'early_morning':
      return 'early mornings (before 8am)';
    case 'morning':
      return 'mornings';
    case 'afternoon':
      return 'afternoons';
    case 'evening':
      return 'evenings';
  }
}

export function formatWeekdayLabel(idx: number): string {
  // JS getDay: 0=Sun..6=Sat
  const labels = [
    'Sundays',
    'Mondays',
    'Tuesdays',
    'Wednesdays',
    'Thursdays',
    'Fridays',
    'Saturdays',
  ] as const;
  return labels[idx] ?? 'those days';
}

export type DayBucket =
  | 'early_week' // Mon–Tue
  | 'mid_week' // Wed–Thu
  | 'late_week' // Fri
  | 'weekend'; // Sat–Sun

export function formatDayBucketLabel(bucket: DayBucket): string {
  switch (bucket) {
    case 'early_week':
      return 'Mondays and Tuesdays';
    case 'mid_week':
      return 'mid-week (Wed–Thu)';
    case 'late_week':
      return 'Fridays';
    case 'weekend':
      return 'weekends';
  }
}

export function getDayBucket(localWeekdayIndex: number): DayBucket {
  // localWeekdayIndex is JS getDay(): 0=Sun..6=Sat
  if (localWeekdayIndex === 0 || localWeekdayIndex === 6) return 'weekend';
  if (localWeekdayIndex === 1 || localWeekdayIndex === 2) return 'early_week';
  if (localWeekdayIndex === 3 || localWeekdayIndex === 4) return 'mid_week';
  return 'late_week'; // Friday
}

export type SizeBucket = 'tiny' | 'small' | 'medium' | 'large';

export function getSizeBucket(
  linesChanged: number | null | undefined,
  filesChanged: number | null | undefined
): SizeBucket {
  const lines = linesChanged ?? 0;
  const files = filesChanged ?? 0;

  if (lines <= 50 && files <= 2) return 'tiny';
  if (lines <= 250 && files <= 6) return 'small';
  if (lines <= 800 && files <= 15) return 'medium';
  return 'large';
}

export function formatSizeLabel(bucket: SizeBucket): string {
  switch (bucket) {
    case 'tiny':
      return 'very small PRs';
    case 'small':
      return 'small PRs';
    case 'medium':
      return 'medium-sized PRs';
    case 'large':
      return 'larger PRs';
  }
}
