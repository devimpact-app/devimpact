import { GithubTimelineEvent } from "@/lib/db/schema";

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

export const normState = (s?: string) => (s ?? "").toLowerCase();

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

export function sortAndBound(
  events: GithubTimelineEvent[],
  endAt: Date,
): GithubTimelineEvent[] {
  return events
    .filter((e) => e?.createdAt && e.createdAt <= endAt)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function computeCycles(
  prCreatedAt: Date,
  events: GithubTimelineEvent[],
  endAt: Date,
) {
  const draftCuts = events
    .filter((e) => e.eventType === "converted_to_draft")
    .map((e) => e.createdAt);

  const starts = [prCreatedAt, ...draftCuts];
  return starts.map((start, i) => ({
    start,
    end: i < draftCuts.length ? draftCuts[i] : endAt,
  }));
}

export function readyish(e: GithubTimelineEvent) {
  return (
    e.eventType === "ready_for_review" || e.eventType === "review_requested"
  );
}

export function firstInCycle(
  events: GithubTimelineEvent[],
  start: Date,
  end: Date,
  predicate: (e: GithubTimelineEvent) => boolean,
): GithubTimelineEvent | undefined {
  return events.find(
    (e) => e.createdAt >= start && e.createdAt <= end && predicate(e),
  );
}

export function lastBefore(
  events: GithubTimelineEvent[],
  cutoff: Date,
  predicate: (e: GithubTimelineEvent) => boolean,
): GithubTimelineEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.createdAt <= cutoff && predicate(e)) return e;
  }
}

export function findCycleForTimestamp(
  cycles: Array<{ start: Date; end: Date }>,
  ts: Date,
) {
  return (
    cycles.find((c) => ts >= c.start && ts <= c.end) ??
    cycles[cycles.length - 1]
  );
}
