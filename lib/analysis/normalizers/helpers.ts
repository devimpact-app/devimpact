export function diffSecondsRounded(
  start?: Date | null,
  end?: Date | null,
): number | null {
  if (!start || !end) return null;
  const diff = (end.getTime() - start.getTime()) / 1000;
  if (Number.isNaN(diff)) return null;
  const rounded = Math.round(diff);
  return rounded > 0 ? rounded : 0;
}

export function groupBy<T extends Record<string, any>>(
  array: T[],
  key: keyof T,
): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}
