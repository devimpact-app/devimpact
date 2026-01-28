'use client';

import { CalendarEventInspectorPanel } from '@/app/(app)/timeline/components/CalendarEventPanel';
import { EventInspectorPanel } from '@/app/(app)/timeline/components/EventInspectorPanel';
import { ActivityEventInspectorResponse } from '@/types/api/threads';
import { useActivityEventInspector } from './useActivityEventInspector';

function renderInspector(
  data: ActivityEventInspectorResponse,
  onClose: () => void
) {
  switch (data.kind) {
    case 'legacy_activity_event':
      return <EventInspectorPanel event={data.event} onClose={onClose} />;
    case 'calendar_event':
      return (
        <CalendarEventInspectorPanel event={data.event} onClose={onClose} />
      );
    default:
      return null;
  }
}

export function ActivityEventInspectorPanel({
  activityEventId,
  onClose,
}: {
  activityEventId?: string | null;
  onClose: () => void;
}) {
  const { data, error, isLoading } = useActivityEventInspector(activityEventId);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4">
        <div className="text-sm font-medium text-rose-200">
          Failed to load event
        </div>
        <div className="mt-1 text-sm text-rose-200/70">{error.message}</div>
      </div>
    );
  }

  if (!data && isLoading)
    return <EventInspectorPanel onClose={onClose} isLoading={true} />;

  if (!data) return null;

  return renderInspector(data, onClose);
}
