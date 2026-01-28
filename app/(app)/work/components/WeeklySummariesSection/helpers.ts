import { formatRange } from '@/lib/utils/date';

export function getStartAndEndDateForWeeklySummary(weekStartLocalDate: string) {
  const startDate = new Date(`${weekStartLocalDate}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid weekStartLocalDate: ${weekStartLocalDate}`);
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return {
    startDate,
    endDate,
  };
}

export function formatWeekRangeForWeeklySummary(weekStartLocalDate: string) {
  const { startDate, endDate } =
    getStartAndEndDateForWeeklySummary(weekStartLocalDate);
  return formatRange(startDate, endDate);
}
