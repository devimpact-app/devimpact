/**
 * Returns the Monday start date for a given week offset.
 *
 * offset:
 *   0 = current week
 *   1 = last completed week
 *   2 = two weeks ago
 */
export async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export function getWeekStartMondayIso(
  offset: number,
  now: Date = new Date()
): string {
  const d = new Date(now);
  const day = d.getDay();
  // Convert so Monday = 0, Sunday = 6
  const daysSinceMonday = (day + 6) % 7;
  // Go to Monday of current week
  d.setDate(d.getDate() - daysSinceMonday);
  // Apply offset (each offset = 1 week back)
  d.setDate(d.getDate() - offset * 7);
  // Zero time to avoid DST edge weirdness
  d.setHours(0, 0, 0, 0);
  // Format YYYY-MM-DD in local time
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}
