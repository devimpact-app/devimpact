export async function withRetry<T>(
  fn: () => Promise<T>,
  opts = { retries: 3, baseMs: 300 },
): Promise<T> {
  let attempt = 0,
    lastErr: any;
  while (attempt <= opts.retries) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, opts.baseMs * 2 ** attempt));
      attempt++;
    }
  }
  throw lastErr;
}
