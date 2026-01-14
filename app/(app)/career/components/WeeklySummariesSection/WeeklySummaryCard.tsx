import { formatDateOnly } from '@/lib/utils/date';
import { WeeklySummaryItem } from '@/types/api/weekly-summary';
import { formatWeekRangeForWeeklySummary } from './helpers';

function StatusPill({ status }: { status: WeeklySummaryItem['status'] }) {
  const base =
    'inline-flex items-center rounded-full border px-2 py-1 text-[11px] leading-none';

  const cls =
    status === 'ready'
      ? 'border-emerald-400/15 bg-emerald-400/5 text-emerald-200/80'
      : status === 'failed'
        ? 'border-rose-400/15 bg-rose-400/5 text-rose-200/80'
        : status === 'generating'
          ? 'border-sky-400/15 bg-sky-400/5 text-sky-200/80'
          : status === 'skipped'
            ? 'border-white/10 bg-white/[0.03] text-white/55'
            : 'border-white/10 bg-white/[0.03] text-white/60';

  const label =
    status === 'ready'
      ? 'Ready'
      : status === 'failed'
        ? 'Failed'
        : status === 'generating'
          ? 'Generating'
          : status === 'skipped'
            ? 'Skipped'
            : 'Pending';

  return <span className={[base, cls].join(' ')}>{label}</span>;
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
      <span className="tabular-nums text-white/80">{value}</span>
      <span>{label}</span>
    </div>
  );
}

export function WeeklySummaryCard({
  summary,
  onClick,
}: {
  summary: WeeklySummaryItem;
  onClick?: (id: string) => void;
}) {
  const headline = summary.output?.headline?.trim() ?? '';
  const bulletsCount = summary.output?.bullets?.length ?? 0;
  const hasOutput = Boolean(summary.output);

  const referencedThreads = summary.referencedThreadIds?.length ?? 0;
  const referencedEvents = summary.referencedEventIds?.length ?? 0;

  const weekLabel = formatWeekRangeForWeeklySummary(summary.weekStartLocalDate);

  const rightMeta =
    summary.status === 'ready'
      ? summary.emailedAt
        ? `Emailed ${formatDateOnly(summary.emailedAt)}`
        : summary.generatedAt
          ? `Generated ${formatDateOnly(summary.generatedAt)}`
          : 'Ready'
      : summary.status === 'failed'
        ? summary.lastErrorAt
          ? `Failed ${formatDateOnly(summary.lastErrorAt)}`
          : 'Failed'
        : summary.status === 'generating'
          ? summary.generationStartedAt
            ? `Started ${formatDateOnly(summary.generationStartedAt)}`
            : 'In progress'
          : summary.status === 'pending'
            ? summary.nextAttemptAt
              ? `Next ${formatDateOnly(summary.nextAttemptAt)}`
              : `Attempts ${summary.attempts}`
            : '—';

  return (
    <button
      type="button"
      onClick={() => onClick?.(summary.id)}
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
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-[15px] font-semibold tracking-tight text-white">
            {weekLabel}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/50">
            <StatusPill status={summary.status} />
            <span className="text-white/25">·</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
          <div className="text-[11px] text-white/55">
            <span className="tabular-nums text-white/70">{rightMeta}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 text-[13px] leading-relaxed text-white/70">
        {summary.status === 'failed' ? (
          <p className="line-clamp-2 text-rose-200/70">
            {summary.lastError?.trim()
              ? summary.lastError
              : 'Generation failed.'}
          </p>
        ) : summary.status === 'skipped' ? (
          <p className="text-white/45">
            No notable activity detected for this week.
          </p>
        ) : hasOutput ? (
          <p className="line-clamp-2">{headline || 'Weekly summary ready.'}</p>
        ) : summary.status === 'generating' ? (
          <p className="text-white/55">Generating summary…</p>
        ) : (
          <p className="text-white/55">Queued for generation.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MetricChip label="Bullets" value={bulletsCount} />
        <MetricChip label="Threads" value={referencedThreads} />
        <MetricChip label="Events" value={referencedEvents} />

        <div className="mx-1 h-3 w-px bg-white/10" />

        {summary.status === 'ready' && summary.emailedAt ? (
          <div className="truncate text-[11px] text-white/50">
            <span className="text-white/45">Delivery:</span>{' '}
            <span className="text-white/65">Email sent</span>
          </div>
        ) : summary.status === 'ready' ? (
          <div className="truncate text-[11px] text-white/50">
            <span className="text-white/45">Delivery:</span>{' '}
            <span className="text-white/65">Not sent</span>
          </div>
        ) : summary.status === 'pending' && summary.nextAttemptAt ? (
          <div className="truncate text-[11px] text-white/50">
            <span className="text-white/45">Next attempt:</span>{' '}
            <span className="tabular-nums text-white/65">
              {formatDateOnly(summary.nextAttemptAt)}
            </span>
          </div>
        ) : null}
      </div>
    </button>
  );
}
