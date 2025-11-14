import { truncateToDay } from "@/lib/utils/date";
import { ActivityEvent } from "@/types/api/timeline";
import { dotColor, LegendDot } from "./DotLogic";

export function FourWeekSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3 animate-pulse">
      <div className="mb-2 h-3 w-36 rounded bg-slate-700/30" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-24 w-full rounded-full bg-slate-800/40 border border-slate-700/50" />
            <div className="h-3 w-20 rounded bg-slate-700/30" />
            <div className="h-3 w-24 rounded bg-slate-700/20" />
          </div>
        ))}
      </div>
    </section>
  );
}

type WeekBucket = {
  weekStart: Date;
  label: string;
  events: ActivityEvent[];
};

function buildWeekBuckets(start: Date, end: Date): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    if (cursor > end) break;

    const label = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(cursor);

    buckets.push({
      weekStart: new Date(cursor),
      label,
      events: [],
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return buckets;
}

function assignEventsToWeeks(
  start: Date,
  buckets: WeekBucket[],
  events: ActivityEvent[],
): WeekBucket[] {
  const startDay = truncateToDay(start).getTime();

  for (const ev of events) {
    const d = truncateToDay(new Date(ev.occurredAt));
    const diffDays = Math.floor(
      (d.getTime() - startDay) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) continue;

    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex < 0 || weekIndex >= buckets.length) continue;

    buckets[weekIndex].events.push(ev);
  }

  return buckets;
}

function summarizeWeek(events: ActivityEvent[]) {
  let prCount = 0;
  let reviewCount = 0;
  let commitCount = 0;

  for (const ev of events) {
    switch (ev.kind) {
      case "pr_opened":
      case "pr_merged":
        prCount++;
        break;
      case "review_submitted":
        reviewCount++;
        break;
      case "pr_commit":
        commitCount++;
        break;
    }
  }

  const total = events.length;
  return { total, prCount, reviewCount, commitCount };
}

function WeekBubble({ week }: { week: WeekBucket }) {
  const { events } = week;
  const { total, prCount, reviewCount, commitCount } = summarizeWeek(events);

  // Limit dots so it doesn’t get insane visually
  const maxDots = 60;
  const shownEvents =
    events.length > maxDots ? events.slice(0, maxDots) : events;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-24 w-full rounded-full border border-border bg-surface/70 overflow-hidden flex items-center justify-center">
        {/* dot cluster – simple jittered layout in a circle-ish area */}
        <div className="relative h-20 w-20">
          {shownEvents.map((ev, idx) => {
            const angle = (idx / shownEvents.length) * Math.PI * 2;
            const radius = 35 + (idx % 3) * 8; // percentage of half-size, tweak for density

            const x = 50 + Math.cos(angle) * radius * 0.8;
            const y = 50 + Math.sin(angle) * radius * 0.8;

            return (
              <span
                key={ev.id + idx}
                className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-[0_0_4px_1px_rgba(0,0,0,0.25)] ${dotColor(
                  ev.kind,
                )}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              />
            );
          })}
          {events.length > maxDots && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-text-secondary/80 bg-surface/70 rounded-full">
              +{events.length - maxDots} more
            </span>
          )}
        </div>
      </div>

      <span className="text-[10px] text-text-secondary">
        Week of {week.label}
      </span>
      <span className="text-[10px] text-text-tertiary">
        {total} events · {prCount} PRs · {reviewCount} reviews
        {commitCount ? ` · ${commitCount} commits` : null}
      </span>
    </div>
  );
}

export function FourWeekView({
  start,
  end,
  events,
}: {
  start: Date;
  end: Date;
  events: ActivityEvent[];
}) {
  let buckets = buildWeekBuckets(start, end);
  buckets = assignEventsToWeeks(start, buckets, events);

  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Activity last 4 weeks
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-red-400 border-red-300" />
            <span>Commits</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-emerald-400 border-emerald-300" />
            <span>PR Events</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-sky-400 border-sky-300" />
            <span>Reviews</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-slate-400 border-slate-300" />
            <span>Other</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {buckets.map((week, idx) => (
          <WeekBubble key={idx} week={week} />
        ))}
      </div>
    </section>
  );
}
