export async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = [];
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const current = i++;
      results[current] = await fn(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
