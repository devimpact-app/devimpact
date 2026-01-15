import { getWeekdayIndex, toDate, truncateToDay } from '@/lib/utils/date';
import { ActivityEvent, ActivityEventKind } from '@/types/api/timeline';

type Lane = 0 | 1 | 2;
const LANE_COUNT = 3;
// How close in time (as ratio 0–1) counts as "same vertical band"
const COLLISION_THRESHOLD = 0.04;

export type TimelineDot = {
  id: string;
  dayIndex: number; // 0-6
  laneIndex: Lane; // 0-2
  timeRatio: number; // 0-1 (0 = midnight, 1 = 23:59)
  event: ActivityEvent;
};

export function dotColor(kind: ActivityEventKind): string {
  switch (kind) {
    case 'pr_commit':
      return 'bg-red-400 border-red-300';
    case 'pr_opened':
    case 'pr_merged':
      return 'bg-emerald-400 border-emerald-300';
    case 'review_submitted':
      return 'bg-sky-400 border-sky-300';
    default:
      // Future: meetings / other signals
      return 'bg-slate-400 border-slate-300';
  }
}

export function LegendDot({ className }: { className: string }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full border ${className}`} />
  );
}

export function kindLabel(kind: ActivityEventKind): string {
  switch (kind) {
    case 'pr_commit':
      return 'Commit';
    case 'pr_opened':
      return 'PR opened';
    case 'pr_merged':
      return 'PR merged';
    case 'review_submitted':
      return 'Review submitted';
    default:
      return kind;
  }
}

const DOT_KINDS: ActivityEventKind[] = [
  'pr_commit',
  'pr_opened',
  'pr_merged',
  'review_submitted',
];

function isDotEvent(ev: ActivityEvent) {
  return DOT_KINDS.includes(ev.kind as any);
}

export function toDotsForWeek(events: ActivityEvent[]): TimelineDot[] {
  const dots: TimelineDot[] = [];

  // Track dots per day to decide lane assignment locally
  const dotsByDay: Record<number, TimelineDot[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  for (const ev of events) {
    if (!isDotEvent(ev)) continue;
    const raw = new Date(ev.occurredAt);
    if (Number.isNaN(raw.getTime())) continue;

    // 0–6 (Mon–Sun) using your helper
    const dayIndex = getWeekdayIndex(raw);
    if (dayIndex < 0 || dayIndex > 6) continue; // defensive, should never happen

    const local = toDate(raw);
    const hours = local.getHours() + local.getMinutes() / 60;
    const timeRatio = hours / 24; // 0–1 over local day

    const dayDots = dotsByDay[dayIndex] ?? [];

    // Find other dots in this day that are roughly at the same vertical band
    const nearbyDots = dayDots.filter(
      (dot) => Math.abs(dot.timeRatio - timeRatio) < COLLISION_THRESHOLD
    );

    // Use nearby count to stagger lanes 0,1,2
    const laneIndex = (nearbyDots.length % LANE_COUNT) as Lane;

    const dot: TimelineDot = {
      id: ev.id,
      dayIndex,
      laneIndex,
      timeRatio,
      event: ev,
    };

    dayDots.push(dot);
    dotsByDay[dayIndex] = dayDots;
    dots.push(dot);
  }

  return dots;
}
