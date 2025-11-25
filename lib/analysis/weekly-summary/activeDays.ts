import { getLocalWeekdayIndex, toLocalDate } from '@/lib/utils/date';

const WEEKDAY_LABELS: (
  | 'Sun'
  | 'Mon'
  | 'Tue'
  | 'Wed'
  | 'Thu'
  | 'Fri'
  | 'Sat'
)[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ActiveDayResult = {
  activeDays: number;
  mostActiveDay?: (typeof WEEKDAY_LABELS)[number];
};

/**
 * Given a list of ISO timestamps and a timezone string, compute:
 * - activeDays: number of unique calendar days with any activity
 * - mostActiveDay: weekday label with the highest number of events
 */
export function computeActiveDaysAndMostActiveDay(
  dates: Date[],
  timezone: string
): ActiveDayResult {
  if (dates.length === 0) {
    return { activeDays: 0, mostActiveDay: undefined };
  }

  const dayCounts = new Map<string, number>();
  const weekdayCounts = new Map<number, number>();
  for (const date of dates) {
    if (!(date instanceof Date) || isNaN(date.getTime())) continue;

    const local = toLocalDate(date, timezone);

    // Unique calendar day (YYYY-MM-DD) *in that timezone*
    const dayKey = local.toLocaleDateString('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);

    const weekdayIndex = getLocalWeekdayIndex(date, timezone);
    weekdayCounts.set(weekdayIndex, (weekdayCounts.get(weekdayIndex) ?? 0) + 1);
  }

  const activeDays = dayCounts.size;

  let mostActiveDay: (typeof WEEKDAY_LABELS)[number] | undefined = undefined;
  let maxCount = 0;

  for (const [weekdayIndex, count] of weekdayCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveDay = WEEKDAY_LABELS[weekdayIndex];
    }
  }

  return { activeDays, mostActiveDay };
}
