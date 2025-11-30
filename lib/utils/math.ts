export function computeMedian(values: number[]): number {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

export function computeMedianClamped(
  values: number[],
  { min = 0, max = 1 } = {}
): number {
  const cleaned = values.filter(
    (v) => Number.isFinite(v) && v >= min && v <= max
  );
  if (!cleaned.length) return 0;
  return computeMedian(cleaned);
}
