import { ActivityEvent } from '@/types/api/timeline';
import { clusterCommitEvents } from './clusterEvents';
import { ActivityLogRow } from './ActivityLogRow';
import { useMemo } from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { ArrowRight } from 'lucide-react';

type ActivityLogMode = 'preview' | 'full';

type ActivityLogProps = {
  events: ActivityEvent[];
  loading: boolean;
  mode?: ActivityLogMode;
  onEventClick?: (event: ActivityEvent) => void;
};

const SKELETON_ROWS = 4;

export function ActivityLog({
  events,
  loading,
  mode = 'preview',
  onEventClick,
}: ActivityLogProps) {
  const clustered = clusterCommitEvents(events);
  const displayEvents = mode === 'preview' ? clustered.slice(0, 5) : clustered;

  const showViewAll = mode === 'preview' && displayEvents.length > 0;

  const grouped = useMemo(() => {
    if (loading || mode !== 'full') return [];

    const result: {
      dayLabel: string;
      events: ActivityEvent[];
    }[] = [];

    let currentDay: string | null = null;
    let bucket: ActivityEvent[] = [];

    for (const ev of displayEvents) {
      const d = new Date(ev.occurredAt);
      const dayLabel = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      if (dayLabel !== currentDay) {
        // flush previous bucket
        if (bucket.length > 0) {
          result.push({ dayLabel: currentDay!, events: bucket });
          bucket = [];
        }
        currentDay = dayLabel;
      }

      bucket.push(ev);
    }

    // flush last bucket
    if (bucket.length > 0 && currentDay) {
      result.push({ dayLabel: currentDay, events: bucket });
    }

    return result;
  }, [loading, mode, displayEvents]);

  const timelineHref = '/timeline';
  const subtitle =
    mode === 'full'
      ? 'Recent work across pull requests and reviews.'
      : 'Recent work across pull requests, reviews, and meetings.';

  return (
    <section className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-5 py-4 shadow-sm shadow-black/30">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-50">
            Recent activity
          </h2>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>

        {showViewAll && (
          <ActionButton href={timelineHref} variant="primary">
            View full timeline <ArrowRight className="h-4 w-4" />
          </ActionButton>
        )}
      </header>

      {loading && (
        <div className="space-y-2 pt-1">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-1 py-1.5"
            >
              <div className="h-7 w-7 rounded-full bg-slate-800/70 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-40 rounded bg-slate-800/70 animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-slate-900/70 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && displayEvents.length === 0 && (
        <div className="pt-1 text-[11px] text-slate-400">
          No activity found for this period. Once you sync with the CLI, your
          PRs, reviews, and commits will appear here.
        </div>
      )}

      {!loading && displayEvents.length > 0 && (
        <div className="space-y-3 pt-1">
          {mode === 'full'
            ? grouped.map((group) => (
                <div key={group.dayLabel} className="space-y-1.5">
                  {/* Day header */}
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500/80 px-0.5">
                    {group.dayLabel}
                  </div>

                  {/* Events for that day */}
                  {group.events.map((ev) => (
                    <ActivityLogRow
                      key={ev.id}
                      event={ev}
                      mode={mode}
                      onEventClick={onEventClick}
                    />
                  ))}
                </div>
              ))
            : /* preview mode: no headers */
              displayEvents.map((ev) => (
                <ActivityLogRow key={ev.id} event={ev} mode={mode} />
              ))}
        </div>
      )}

      {mode === 'full' && !loading && displayEvents.length > 0 && (
        <p className="mt-3 text-[10px] text-slate-500">
          Showing all activity in the selected range.
        </p>
      )}
    </section>
  );
}
