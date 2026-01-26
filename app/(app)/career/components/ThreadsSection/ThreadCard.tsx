import { ThreadListItem } from '@/types/api/threads';
import { categoryLabel, categoryPillClasses } from '../../threads/shared';

function formatDateShort(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
      <span className="tabular-nums text-white/80">{value}</span>
      <span>{label}</span>
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
                'inline-flex items-center rounded-full border px-2 py-1 text-xs leading-none',
                categoryPillClasses(thread.categoryKey),
              ].join(' ')}
            >
              {categoryLabel(thread.categoryKey)}
            </span>

            {thread.status === 'archived' ? (
              <span className="text-xs text-white/45">Archived</span>
            ) : null}
          </div>

          <div className="text-[15px] font-semibold tracking-tight text-white">
            {thread.title}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 pt-1">
          <div className="text-xs text-white/55">
            <span className="text-white/45 mr-1">Last activity</span>{' '}
            <span className="tabular-nums text-white/70">
              {formatDateShort(lastActive)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 text-sm leading-relaxed text-white/70">
        <p>{thread.summaryHeadline ?? 'No summary yet'}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MetricChip label="PRs" value={thread.eventCountsByKind.pr} />
        <MetricChip label="Reviews" value={thread.eventCountsByKind.review} />
        <MetricChip label="Meetings" value={thread.eventCountsByKind.meeting} />
        {thread.eventCountsByKind.ooo > 0 ? (
          <MetricChip label="OOO" value={thread.eventCountsByKind.ooo} />
        ) : null}

        <div className="mx-1 h-3 w-px bg-white/10" />

        {thread.lastEvent ? (
          <div className="flex items-center justify-between gap-3 text-[13px] text-white/50">
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
