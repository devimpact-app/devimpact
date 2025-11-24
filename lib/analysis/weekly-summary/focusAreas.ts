export function buildTagFrequencyMap(tags: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const tag of tags) {
    if (!tag) continue;
    freq.set(tag, (freq.get(tag) ?? 0) + 1);
  }
  return freq;
}

export function pickTopFocusAreas(
  freq: Map<string, number>,
  maxAreas = 6
): string[] {
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]); // highest count first

  // Optionally drop super-rare tags (count = 1) if there are many
  const filtered =
    sorted.length > maxAreas
      ? sorted.filter(([_, count]) => count > 1)
      : sorted;

  const finalList = (filtered.length > 0 ? filtered : sorted)
    .slice(0, maxAreas)
    .map(([tag]) => tag);

  return finalList;
}

export function buildWhatYouWorkedOnSummary(focusAreas: string[]): string {
  if (focusAreas.length === 0) {
    return 'Your work this week was spread across smaller changes and general improvements.';
  }

  if (focusAreas.length === 1) {
    return `Your work this week centered around ${focusAreas[0]}.`;
  }

  if (focusAreas.length === 2) {
    return `You focused on ${focusAreas[0]} and ${focusAreas[1]}.`;
  }

  // 3+ areas
  return `Most of your work involved ${focusAreas[0]} and ${focusAreas[1]}, with changes touching ${focusAreas[2]}.`;
}
