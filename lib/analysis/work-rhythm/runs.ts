import { ScoredWindow, SlicePredicate, TimeSlice, WindowStats } from './types';

function overlaps(a: ScoredWindow, b: ScoredWindow) {
  return a.startUtc < b.endUtc && b.startUtc < a.endUtc;
}

function overlapsWithPadding(
  a: ScoredWindow,
  b: ScoredWindow,
  padMinutes: number
) {
  const padMs = padMinutes * 60_000;
  const a0 = new Date(a.startUtc.getTime() - padMs);
  const a1 = new Date(a.endUtc.getTime() + padMs);
  return a0 < b.endUtc && b.startUtc < a1;
}

export function pickTopNonOverlapping<T extends ScoredWindow>(
  windows: T[],
  limit: number,
  opts?: { padMinutes?: number }
): T[] {
  const pad = opts?.padMinutes ?? 0;
  const sorted = [...windows].sort((a, b) => b.score - a.score);

  const picked: T[] = [];
  for (const w of sorted) {
    if (picked.length >= limit) break;

    const conflict = picked.some((p) =>
      pad > 0 ? overlapsWithPadding(p, w, pad) : overlaps(p, w)
    );
    if (!conflict) picked.push(w);
  }
  return picked;
}

export function collectRunsBySlice(
  slices: TimeSlice[],
  predicate: SlicePredicate
): { startIdx: number; endIdx: number }[] {
  const runs: { startIdx: number; endIdx: number }[] = [];
  let start: number | null = null;

  for (let i = 0; i < slices.length; i++) {
    const ok = predicate(slices[i]);
    if (ok && start === null) start = i;
    if (!ok && start !== null) {
      runs.push({ startIdx: start, endIdx: i - 1 });
      start = null;
    }
  }
  if (start !== null) runs.push({ startIdx: start, endIdx: slices.length - 1 });

  return runs;
}

export function summarizeWindowSlices(
  slices: TimeSlice[],
  startIdx: number,
  endIdx: number
): WindowStats {
  const windowSlices = slices.slice(startIdx, endIdx + 1);
  const durPer = windowSlices[0]?.durationMinutes ?? 15;

  const meetingSlices = windowSlices.filter((s) => s.hasMeeting).length;
  const workSlices = windowSlices.filter((s) => s.hasWork).length;
  const workEventCount = windowSlices.reduce(
    (sum, s) => sum + (s.eventCount || 0),
    0
  );

  const sliceCount = windowSlices.length;
  const durationMinutes = sliceCount * durPer;

  return {
    startUtc: windowSlices[0].startUtc,
    endUtc: windowSlices[windowSlices.length - 1].endUtc,
    durationMinutes,
    sliceCount,
    meetingSlices,
    workSlices,
    meetingShare: sliceCount ? meetingSlices / sliceCount : 0,
    workEventCount,
  };
}

export function windowsFromRuns(params: {
  slices: TimeSlice[];
  runs: { startIdx: number; endIdx: number }[];
  minWindowMinutes: number;
  maxWindowMinutes: number;
  // defines how to score a window (deep work vs focus vs protect)
  scoreWindow: (stats: WindowStats) => { score: number; reasons: string[] };
}): ScoredWindow[] {
  const { slices, runs, minWindowMinutes, maxWindowMinutes, scoreWindow } =
    params;

  const durPer = slices[0]?.durationMinutes ?? 15;
  const minSlices = Math.ceil(minWindowMinutes / durPer);
  const maxSlices = Math.floor(maxWindowMinutes / durPer);

  const out: ScoredWindow[] = [];

  for (const run of runs) {
    const runLen = run.endIdx - run.startIdx + 1;
    if (runLen < minSlices) continue;

    // MVP: choose best sub-window via sliding window on indices
    // (same code for focus/deep/protect)
    for (let start = run.startIdx; start <= run.endIdx; start++) {
      const end = Math.min(run.endIdx, start + maxSlices - 1);
      const stats = summarizeWindowSlices(slices, start, end);
      if (stats.durationMinutes < minWindowMinutes) continue;

      const { score, reasons } = scoreWindow(stats);
      if (score <= 0) continue;

      out.push({ ...stats, score, reasons });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}
