import { ThreadCategory, ThreadListItem } from '@/types/api/threads';

function formatDateShort(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTimeCompact(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function categoryLabel(key: ThreadCategory) {
  switch (key) {
    case 'features':
      return 'Features';
    case 'bugs_incidents':
      return 'Bugs / Incidents';
    case 'tech_debt':
      return 'Tech Debt';
    case 'collaboration':
      return 'Collaboration';
    case 'alignment':
      return 'Alignment';
    case 'skill_growth':
      return 'Skill Growth';
    case 'hiring':
      return 'Hiring';
    default:
      return 'Thread';
  }
}

function categoryPillClasses(key: ThreadCategory) {
  switch (key) {
    case 'features':
      return 'border-indigo-400/30 bg-indigo-400/10 text-indigo-300';

    case 'bugs_incidents':
      return 'border-rose-400/30 bg-rose-400/10 text-rose-300';

    case 'tech_debt':
      return 'border-violet-400/25 bg-violet-400/10 text-violet-300';

    case 'collaboration':
      return 'border-teal-400/25 bg-teal-400/10 text-teal-300';

    case 'alignment':
      return 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300';

    case 'skill_growth':
      return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300';

    case 'hiring':
      return 'border-purple-400/25 bg-purple-400/10 text-purple-300';

    default:
      return 'border-white/15 bg-white/5 text-white/75';
  }
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
      <span className="tabular-nums text-white/80">{value}</span>
      <span>{label}</span>
    </div>
  );
}

import { useState } from 'react';

function ThreadSummary({ summary }: { summary?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!summary?.trim()) {
    return <p className="mt-2 text-[13px] text-white/45">No summary yet.</p>;
  }

  const isLong = summary.length > 140; // heuristic, tweak as needed

  return (
    <div className="mt-2 text-[13px] leading-relaxed text-white/70">
      <p className={expanded ? '' : 'line-clamp-1'}>{summary}</p>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[12px] text-white/50 hover:text-white/80 transition-colors"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
}

export function ThreadCard({
  thread,
  onClick,
}: {
  thread: ThreadListItem;
  onClick?: (id: string) => void;
}) {
  const lastActive = thread.lastActivityAt ?? thread.firstActivityAt;

  return (
    <button
      type="button"
      onClick={() => onClick?.(thread.id)}
      className={[
        'w-full text-left',
        'rounded-2xl border border-white/10 bg-white/[0.04]',
        'px-5 py-4',
        'transition',
        'hover:border-white/20 hover:bg-white/[0.06]',
        'focus:outline-none focus:ring-2 focus:ring-white/20',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-row gap-2">
          <div className="flex items-center gap-2">
            <span
              className={[
                'inline-flex items-center rounded-full border px-2 py-1 text-[11px] leading-none',
                categoryPillClasses(thread.categoryKey),
              ].join(' ')}
            >
              {categoryLabel(thread.categoryKey)}
            </span>

            {thread.status === 'archived' ? (
              <span className="text-[11px] text-white/45">Archived</span>
            ) : null}
          </div>

          <div className="text-[15px] font-semibold tracking-tight text-white">
            {thread.title}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 pt-1">
          <div className="text-[11px] text-white/55">
            <span className="text-white/45 mr-1">Last activity</span>{' '}
            <span className="tabular-nums text-white/70">
              {formatDateShort(lastActive)}
            </span>
          </div>
        </div>
      </div>

      <ThreadSummary summary={thread.summary} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MetricChip label="PRs" value={thread.eventCountsByKind.pr} />
        <MetricChip label="Reviews" value={thread.eventCountsByKind.review} />
        <MetricChip label="Meetings" value={thread.eventCountsByKind.meeting} />
        {thread.eventCountsByKind.ooo > 0 ? (
          <MetricChip label="OOO" value={thread.eventCountsByKind.ooo} />
        ) : null}

        <div className="mx-1 h-3 w-px bg-white/10" />

        {thread.lastEvent ? (
          <div className="flex items-center justify-between gap-3 text-[11px] text-white/50">
            <div className="truncate">
              <span className="text-white/45">Last:</span>{' '}
              <span className="text-white/65">{thread.lastEvent.title}</span>
            </div>
          </div>
        ) : null}
      </div>
    </button>
  );
}
