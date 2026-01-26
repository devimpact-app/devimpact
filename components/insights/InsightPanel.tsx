import { cn } from '@/lib/utils';
import type { Insight, InsightRelatedItem } from '@/types/api/insights';
import { ExternalLink, Info, X } from 'lucide-react';

const severityLabel: Record<Insight['severity'], string> = {
  info: 'Observation',
  positive: 'Opportunity',
  warning: 'Friction',
  critical: 'Blocker',
};

const severityPillClasses: Record<Insight['severity'], string> = {
  info: 'border-slate-600/70 text-slate-200 bg-slate-900/80',
  positive: 'border-emerald-500/50 text-emerald-200 bg-emerald-500/10',
  warning: 'border-amber-400/60 text-amber-200 bg-amber-500/10',
  critical: 'border-rose-500/70 text-rose-200 bg-rose-500/10',
};

function kindLabel(kind: Insight['kind']): string {
  switch (kind) {
    case 'fast_loops':
      return 'Fast loops';
    case 'friction_themes':
      return 'Review friction';
    case 'bottlenecks':
      return 'Bottlenecks';
    default:
      return kind;
  }
}

function entityTypeLabel(item: InsightRelatedItem): string {
  switch (item.entityType) {
    case 'pull_request':
      return 'Pull request';
    case 'review':
      return 'Review';
    default:
      return '';
  }
}

export function InsightPanel({
  insight,
  onClose,
}: {
  insight: Insight;
  onClose: () => void;
}) {
  const primaryStats = insight.stats.filter(
    (s) => !s.importance || s.importance === 'primary'
  );
  const secondaryStats = insight.stats.filter(
    (s) => s.importance === 'secondary'
  );

  return (
    <aside
      className="fixed right-0 top-0 bottom-0 w-full max-w-[500px]
      bg-surface-alt border-l border-border 
      shadow-2xl z-50 animate-slideIn
      flex flex-col px-4 py-3"
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px]',
                'bg-slate-950/80',
                severityPillClasses[insight.severity]
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span className="font-medium">
                {severityLabel[insight.severity]}
              </span>
              <span className="text-slate-400/80">
                · {kindLabel(insight.kind)}
              </span>
            </span>

            {insight.timeWindowLabel && (
              <span className="text-[11px] text-slate-500">
                {insight.timeWindowLabel}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 transition-colors ml-1"
          aria-label="Close insight inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Title + emphasis */}
      <div className="mt-5 space-y-1">
        <h2 className="text-sm font-semibold text-slate-50 leading-snug">
          {insight.title}
        </h2>
        {insight.emphasis && (
          <p className="text-[11px] text-slate-400">{insight.emphasis}</p>
        )}
      </div>

      {/* Scrollable content */}
      <div className="mt-4 flex-1 space-y-5 overflow-y-auto pb-4 pr-1 no-scrollbar">
        {/* Summary / body */}
        {insight.body && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Summary
            </h3>
            <p className="text-[13px] leading-relaxed text-slate-300">
              {insight.body}
            </p>
          </section>
        )}

        {/* Key numbers */}
        {(primaryStats.length > 0 || secondaryStats.length > 0) && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Key numbers
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {primaryStats.map((s) => (
                <div
                  key={`${s.label}-${s.value}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2"
                >
                  <div className="text-xs font-semibold text-slate-50">
                    {s.value}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {s.label}
                  </div>
                </div>
              ))}

              {secondaryStats.map((s) => (
                <div
                  key={`${s.label}-${s.value}`}
                  className="rounded-lg border border-slate-900 bg-slate-950/60 px-2.5 py-2"
                >
                  <div className="text-[11px] font-medium text-slate-100">
                    {s.value}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transparency / how we decided to surface this */}
        {insight.transparency && (
          <section>
            <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              Why this surfaced
            </h3>

            <p className="text-xs leading-relaxed text-slate-300">
              {insight.transparency.summary}
            </p>

            {insight.transparency.bullets &&
              insight.transparency.bullets.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                  {insight.transparency.bullets.map((b) => (
                    <li key={b} className="flex gap-1.5">
                      <span className="mt-[5px] h-[3px] w-[3px] rounded-full bg-slate-500/80" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

            {insight.transparency.thresholds &&
              insight.transparency.thresholds.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {insight.transparency.thresholds.map((t) => (
                    <div
                      key={t.key}
                      className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2"
                    >
                      <div className="text-[10px] font-medium text-slate-400">
                        {t.label}
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-50">
                        {t.actual}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {t.condition}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>
        )}

        {/* Related activity */}
        {insight.relatedItems && insight.relatedItems.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Related activity
            </h3>

            <div className="space-y-2">
              {insight.relatedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100 line-clamp-2">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {item.subtitle}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-slate-500">
                        {entityTypeLabel(item)}
                      </div>
                    </div>

                    {item.htmlUrl && (
                      <a
                        href={item.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:text-slate-50 hover:bg-slate-800 transition-colors"
                        aria-label="Open on GitHub"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {item.stats && item.stats.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.stats.map((s) => (
                        <span
                          key={`${item.id}-${s.label}-${s.value}`}
                          className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-[2px] text-[10px] text-slate-300"
                        >
                          <span className="font-medium text-slate-100 mr-1">
                            {s.value}
                          </span>
                          <span className="text-slate-400">{s.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
