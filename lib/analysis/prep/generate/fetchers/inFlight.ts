export async function fetchInFlightContext(params: {
  tenantId: string;
  timezone: string;
  now?: Date;
}): Promise<{}> {
  const { tenantId, timezone, now = new Date() } = params;

  // Open PRs - not merged, can be draft, etc
  // Set lookback date max, so we don't keep pulling in stale stuff
  // Put into LLM format

  // Later: reviews waiting on me
  // Set lookback date max
  /// Put into LLM format
  // Need to update CLI to pull these in
}
