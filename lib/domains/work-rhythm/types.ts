export type TimeSlice = {
  startUtc: Date;
  endUtc: Date;
  durationMinutes: number; // Always 15 for now

  hasMeeting: boolean; // any meeting overlaps this slice
  hasWork: boolean; // any coding/review activity in this slice

  eventCount: number; // total work events touching this slice
};

export type WindowStats = {
  startUtc: Date;
  endUtc: Date;
  durationMinutes: number;

  sliceCount: number;
  meetingSlices: number;
  workSlices: number;

  meetingShare: number;
  workEventCount: number;
};

export type ScoredWindow<TMeta = unknown> = WindowStats & {
  score: number;
  reasons: string[];
  meta?: TMeta;
};

export type SliceScorer = (s: TimeSlice) => number;
export type SlicePredicate = (s: TimeSlice) => boolean;

export type WindowScorer = (stats: WindowStats) => number; // optional layer
