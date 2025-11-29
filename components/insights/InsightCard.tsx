import { cn } from '@/lib/utils';
import type { Insight } from '@/types/api/insights';
import clsx from 'clsx';
import { useState } from 'react';

export const severityStyles = {
  info: {
    dot: 'bg-slate-400/80',
    border: 'border-white/10',
    chip: 'text-slate-300 border-white/10 bg-white/5',
  },
  positive: {
    dot: 'bg-emerald-400',
    border: 'border-emerald-400/20',
    chip: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  },
  warning: {
    dot: 'bg-amber-400',
    border: 'border-amber-400/20',
    chip: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  },
  critical: {
    dot: 'bg-rose-500',
    border: 'border-rose-500/25',
    chip: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
  },
} as const;

export const severityLabel: Record<Insight['severity'], string> = {
  info: 'Observation',
  positive: 'Opportunity',
  warning: 'Friction',
  critical: 'Blocker',
};

function InsightBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  const shouldClamp = text.length > 220; // simple heuristic — adjust as needed
  const displayText = text;

  return (
    <div className="mt-2 mb-4 text-[13px] text-slate-400 leading-relaxed">
      <p
        className={clsx(
          'transition-all',
          shouldClamp && !expanded && 'line-clamp-3'
        )}
      >
        {displayText}
      </p>

      {shouldClamp && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="mt-1 text-sky-400 hover:text-sky-300 text-[12px] font-medium"
        >
          {expanded ? 'Show less' : 'See more'}
        </button>
      )}
    </div>
  );
}

export function InsightCard({
  insight,
  onClick,
}: {
  insight: Insight;
  onClick: () => void;
}) {
  const styles = severityStyles[insight.severity];

  return (
    <article
      className={cn(
        'rounded-2xl bg-[#111520] p-5 border flex flex-col h-full',
        styles.border,
        'transition-all duration-150',
        'hover:border-white/20 hover:bg-[#131824] hover:-translate-y-[1px] cursor-pointer'
      )}
      onClick={onClick}
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-2 w-2 rounded-full shadow-sm flex-shrink-0',
              styles.dot
            )}
          />
          <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
            {severityLabel[insight.severity]}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-slate-50 leading-snug flex-1">
          {insight.title}
        </h3>
      </header>

      {insight.emphasis && (
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          {insight.emphasis}
        </p>
      )}

      {insight.body && <InsightBody text={insight.body} />}

      {insight.stats && insight.stats.length > 0 && (
        <div className="mt-auto pt-2.5 border-white/5 border-t">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {insight.stats.map((s, i) => (
              <div key={i} className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-slate-100">
                  {s.value}
                </span>
                <span className="text-[11px] text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
