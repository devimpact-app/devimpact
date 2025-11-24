import { ActivityEvent } from '@/types/api/timeline';
import { clusterCommitEvents } from './clusterEvents';
import { ActivityLogRow } from './ActivityLogRow';

type ActivityLogMode = 'preview' | 'full';

type ActivityLogProps = {
  events: ActivityEvent[];
  loading: boolean;
  mode?: ActivityLogMode;
  onViewAllClick?: () => void;
};

export function ActivityLog({
  events,
  loading,
  mode = 'preview',
  onViewAllClick,
}: ActivityLogProps) {
  const clustered = clusterCommitEvents(events);
  const displayEvents = mode === 'preview' ? clustered.slice(0, 5) : clustered;

  if (loading) {
    return <div>hi</div>;
  }

  return (
    <section className="flex flex-col gap-1.5">
      {displayEvents.map((ev) => (
        <ActivityLogRow key={ev.id} event={ev} mode={mode} />
      ))}

      {mode === 'preview' && onViewAllClick && (
        <button
          type="button"
          onClick={onViewAllClick}
          className="mt-2 text-xs text-sky-300 hover:text-sky-200"
        >
          View full timeline →
        </button>
      )}
    </section>
  );
}
