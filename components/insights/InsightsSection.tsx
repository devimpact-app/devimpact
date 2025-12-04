import type { Insight } from '@/types/api/insights';
import { InsightCard } from './InsightCard';
import { InsightLibraryCard } from './InsightsLibraryCard';

export function InsightsSection({
  insights,
  isLoading,
  error,
  onViewAll,
  title,
  subtitle,
  isHighlight = true,
  onInsightClick,
}: {
  insights: Insight[] | undefined;
  isLoading: boolean;
  error: string | null;
  onViewAll?: () => void;
  title?: string;
  subtitle?: string;
  isHighlight?: boolean;
  onInsightClick?: (insight: Insight) => void;
}) {
  return (
    <section className="flex flex-col space-y-3 py-2">
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-50">
          {title ?? 'Insights (last 4 weeks)'}
        </h2>

        <div className="flex items-baseline">
          <p className="text-[11px] mr-6 text-slate-500">
            {subtitle ??
              'Observations, opportunities and friction in how you work.'}
          </p>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-[11px] text-sky-500 hover:text-sky-400 font-medium inline-flex items-center gap-1"
            >
              View all →
            </button>
          )}
        </div>
      </header>

      {isLoading && (
        <div className="space-y-2">
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
        </div>
      )}

      {error && !isLoading && <p className="text-xs text-red-400">{error}</p>}

      {!isLoading && !error && insights && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight) => {
            if (isHighlight) {
              return (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onClick={() => onInsightClick?.(insight)}
                />
              );
            } else {
              return (
                <InsightLibraryCard
                  key={insight.id}
                  insight={insight}
                  onSelect={() => onInsightClick?.(insight)}
                />
              );
            }
          })}
        </div>
      )}

      {!isLoading && !error && insights && insights.length === 0 && (
        <p className="text-[11px] text-slate-500">
          {isHighlight
            ? 'We didn’t surface any strong patterns in this window yet. As more activity accumulates, your strongest insights will appear here.'
            : 'We didn’t identify additional insights in this window. As your activity grows, more will show up here.'}
        </p>
      )}
    </section>
  );
}
