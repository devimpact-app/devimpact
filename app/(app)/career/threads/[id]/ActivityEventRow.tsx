'use client';

import { ActivityEventListItem, ActivityKind } from '@/types/api/threads';
import {
  GitPullRequest,
  MessageSquare,
  Calendar,
  Plane,
  ChevronRight,
} from 'lucide-react';

function kindMeta(kind: ActivityKind) {
  switch (kind) {
    case 'pr':
      return { label: 'PR', Icon: GitPullRequest };
    case 'review':
      return { label: 'Review', Icon: MessageSquare };
    case 'meeting':
      return { label: 'Meeting', Icon: Calendar };
    case 'ooo':
      return { label: 'OOO', Icon: Plane };
    default:
      return { label: 'Event', Icon: Calendar };
  }
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function repoShort(repoFullName?: string | null) {
  if (!repoFullName) return null;
  const parts = repoFullName.split('/');
  return parts.length === 2 ? parts[1] : repoFullName;
}

export function ActivityEventRow({
  event,
  onSelect,
  selected = false,
  dense = false,
}: {
  event: ActivityEventListItem;
  onSelect: (activityEventId: string) => void;
  selected?: boolean;
  dense?: boolean;
}) {
  const dt = event.occurredAt ? new Date(event.occurredAt) : null;
  const timeLabel = dt && !Number.isNaN(dt.getTime()) ? fmtTime(dt) : '';

  const { label, Icon } = kindMeta(event.kind);

  const repo = repoShort(event.repoFullName);
  const repoLine =
    repo && event.prNumber ? `${repo} #${event.prNumber}` : repo ? repo : null;

  const secondaryBits = [
    label,
    repoLine,
    event.subtitle?.trim() ? event.subtitle.trim() : null,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={() => onSelect(event.eventId)}
      className={[
        'group w-full text-left',
        'rounded-xl border bg-white/[0.02] px-3',
        dense ? 'py-2' : 'py-2.5',
        selected
          ? 'border-white/20 bg-white/[0.05]'
          : 'border-white/10 hover:border-white/15 hover:bg-white/[0.035]',
        'transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15',
      ].join(' ')}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
            selected
              ? 'border-white/20 bg-white/[0.06] text-white/85'
              : 'border-white/10 bg-white/[0.03] text-white/70 group-hover:text-white/80',
          ].join(' ')}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className={[
                  'truncate text-[13px] leading-snug',
                  selected ? 'text-white/90' : 'text-white/85',
                ].join(' ')}
              >
                {event.title}
              </div>

              <div className="mt-0.5 truncate text-xs text-white/55">
                {secondaryBits.join(' · ')}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-2">
              <div className="text-xs text-white/45 tabular-nums">
                {timeLabel}
              </div>
              <ChevronRight className="h-4 w-4 text-white/25 transition group-hover:text-white/40" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
