import { cn } from '@/lib/utils';
import type {
  Signal,
  SignalEvidence,
  SignalRelatedItem,
} from '@/types/api/signals';
import { AlertTriangle, ExternalLink, Info, X } from 'lucide-react';

const severityLabel: Record<NonNullable<Signal['severity']>, string> = {
  info: 'FYI',
  attention: 'Attention',
};

const severityPillClasses: Record<NonNullable<Signal['severity']>, string> = {
  info: 'border-white/10 bg-white/[0.03] text-white/75',
  attention: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
};

function kindLabel(kind: Signal['kind']): string {
  switch (kind) {
    case 'multiple_review_rounds':
      return 'Review iterations';
    case 'slow_first_review':
      return 'Review latency';
    case 'large_change':
      return 'Large change';
    case 'long_idle_gap':
      return 'Idle gap';
    default:
      return kind;
  }
}

function entityTypeLabel(item: SignalRelatedItem): string {
  switch (item.entityType) {
    case 'pull_request':
      return 'Pull request';
    case 'review':
      return 'Review';
    default:
      return '';
  }
}

function fmtEvidence(e: SignalEvidence): string {
  const unit = e.unit ? ` ${e.unit}` : '';
  const threshold =
    typeof e.threshold === 'number' ? ` (≥ ${e.threshold}${unit})` : '';
  return `${e.label}: ${e.value}${unit}${threshold}`;
}

export function SignalPanel({
  signal,
  onClose,
}: {
  signal: Signal;
  onClose: () => void;
}) {
  const severity: NonNullable<Signal['severity']> =
    signal.severity ?? 'attention';
  const related = signal.relatedItem;

  const repo = related?.meta?.repoFullName as string | undefined;
  const prNumber = related?.meta?.prNumber as number | undefined;
  const prPill =
    repo && typeof prNumber === 'number' ? `${repo} #${prNumber}` : null;

  return (
    <aside
      className="
        fixed right-0 top-0 bottom-0 w-full max-w-[440px]
        bg-surface-alt border-l border-border shadow-2xl z-50
        animate-slideIn flex flex-col px-4 py-3
      "
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px]',
                severityPillClasses[severity]
              )}
            >
              {severity === 'attention' ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <Info className="h-3.5 w-3.5" />
              )}
              <span className="font-medium">{severityLabel[severity]}</span>
              <span className="text-white/50">· {kindLabel(signal.kind)}</span>
            </span>

            {signal.occurredAt ? (
              <span className="text-[11px] text-white/45">
                {new Date(signal.occurredAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>

        <button
          onClick={onClose}
          className="
            inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full
            border border-white/10 bg-white/[0.03] text-white/55
            hover:text-white/85 hover:bg-white/[0.06] transition-colors
          "
          aria-label="Close signal inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-5 space-y-2">
        <h2 className="text-[13px] font-semibold text-white/90 leading-snug">
          {signal.text}
        </h2>

        {prPill ? (
          <div className="text-[12px] text-white/55">{prPill}</div>
        ) : null}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pb-4 pr-1 no-scrollbar space-y-5">
        {signal.evidence?.length ? (
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/45">
              Evidence
            </h3>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <ul className="space-y-1 text-[12px] text-white/70">
                {signal.evidence.slice(0, 4).map((e, idx) => (
                  <li key={`${e.label}-${idx}`} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                    <span className="leading-relaxed">{fmtEvidence(e)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {related ? (
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/45">
              Related
            </h3>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-white/85 line-clamp-2">
                    {related.title}
                  </div>

                  {related.subtitle ? (
                    <div className="mt-0.5 text-[11px] text-white/45">
                      {related.subtitle}
                    </div>
                  ) : null}

                  <div className="mt-1 text-[11px] text-white/45">
                    {entityTypeLabel(related)}
                  </div>
                </div>

                {related.htmlUrl ? (
                  <a
                    href={related.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="
                      inline-flex h-7 w-7 items-center justify-center rounded-full
                      border border-white/10 bg-white/[0.03] text-white/60
                      hover:text-white/85 hover:bg-white/[0.06] transition-colors
                    "
                    aria-label="Open related item"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
