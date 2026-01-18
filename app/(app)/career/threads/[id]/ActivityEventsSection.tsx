import * as React from 'react';
import { Calendar, Activity } from 'lucide-react';
import { ActivityEventListItem } from '@/types/api/threads';
import { ActivityEventRow } from './ActivityEventRow';

function safeDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function dayKey(dt: Date) {
  // YYYY-MM-DD in user’s local time (good enough for UI grouping)
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtDayLabel(dt: Date) {
  // e.g. "Jan 9"
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type DayGroup = {
  key: string;
  date: Date;
  items: ActivityEventListItem[];
};

function groupEventsByDay(events: ActivityEventListItem[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const e of events) {
    const dt = safeDate(e.occurredAt);
    if (!dt) continue;

    const key = dayKey(dt);
    const existing = map.get(key);
    if (existing) {
      existing.items.push(e);
    } else {
      map.set(key, { key, date: dt, items: [e] });
    }
  }

  const groups = Array.from(map.values());

  // Newest day first
  groups.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Within day: newest first
  for (const g of groups) {
    g.items.sort((a, b) => {
      const ad = safeDate(a.occurredAt)?.getTime() ?? 0;
      const bd = safeDate(b.occurredAt)?.getTime() ?? 0;
      return bd - ad;
    });
  }

  return groups;
}

export function ActivityEventsSection({
  events,
  title = 'Events',
  subtitle = 'Work linked to this thread.',
  onSelect,
}: {
  events: ActivityEventListItem[];
  title?: string;
  subtitle?: string;
  onSelect: (id: string) => void;
}) {
  const total = events?.length ?? 0;
  const groups = React.useMemo(() => groupEventsByDay(events ?? []), [events]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-white/85">{title}</div>
          <div className="mt-1 text-xs text-white/55">{subtitle}</div>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70">
            <Activity className="h-3.5 w-3.5" />
            {total} total
          </span>
        </div>
      </div>

      <div className="mt-4">
        {total === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[13px] text-white/55">
            No events yet.
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-white/70">
                    <Calendar className="h-3.5 w-3.5 text-white/45" />
                    {fmtDayLabel(g.date)}
                  </div>
                  <div className="text-[11px] text-white/45">
                    {g.items.length} {g.items.length === 1 ? 'event' : 'events'}
                  </div>
                </div>

                <div className="space-y-2">
                  {g.items.map((e) => {
                    return (
                      <ActivityEventRow
                        key={e.eventId}
                        event={e}
                        onSelect={onSelect}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
