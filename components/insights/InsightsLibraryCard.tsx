'use client';

import { cn } from '@/lib/utils';
import type { Insight } from '@/types/api/insights';
import { severityLabel, severityStyles } from './InsightCard';

function kindLabel(kind: Insight['kind']): string {
  switch (kind) {
    case 'fast_loops':
      return 'Fast loops';
    case 'bottlenecks':
      return 'Bottlenecks';
    case 'friction_themes':
      return 'Friction themes';
    default:
      return 'Insight';
  }
}

type Props = {
  insight: Insight;
  className?: string;
  onSelect?: (insight: Insight) => void;
};

export function InsightLibraryCard({ insight, className, onSelect }: Props) {
  const styles = severityStyles[insight.severity];
  const primaryStat = insight.stats?.[0];

  // Optional tiny snippet from the body (single line)
  // const snippet =
  //   insight.body && insight.body.length > 0
  //     ? insight.body.length > 120
  //       ? insight.body.slice(0, 117).trimEnd() + '…'
  //       : insight.body
  //     : null;

  return (
    <button
      type="button"
      onClick={onSelect ? () => onSelect(insight) : undefined}
      className={cn(
        'w-full rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3.5 py-3',
        'flex flex-col gap-1.5 text-left',
        'transition-all duration-150',
        'hover:border-white/20 hover:bg-[#131824] hover:-translate-y-[1px] cursor-pointer',
        className
      )}
    >
      {/* Meta row */}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
        <span
          className={cn(
            'h-1.5 w-1.5 flex-shrink-0 rounded-full shadow-sm',
            styles.dot
          )}
        />
        <span>{severityLabel[insight.severity]}</span>
        <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
        <span className="truncate">{kindLabel(insight.kind)}</span>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium leading-snug text-slate-100 line-clamp-3">
        {insight.title}
      </p>

      {/* Optional tiny snippet */}
      {/* {snippet && (
        <p className="text-[11px] text-slate-500 line-clamp-1">{snippet}</p>
      )} */}

      {/* Bottom row: primary stat aligned right */}
      {primaryStat && (
        <div className="mt-1 flex justify-end">
          <div className="text-right">
            <span className="block text-sm font-semibold text-slate-50">
              {primaryStat.value}
            </span>
            <span className="block text-[10px] text-slate-500">
              {primaryStat.label}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
