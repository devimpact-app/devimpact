import { WeeklySummary } from '@/types/api/weekly-summary';
import { SoftStat } from './SoftStat';

type WeeklySummaryCardProps = {
  summary?: WeeklySummary;
  isLoading?: boolean;
  error?: string | null;
  onOpenOneOnOne?: () => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </h3>
  );
}

export function WeeklySummaryCard({
  summary,
  isLoading,
  error,
  onOpenOneOnOne,
}: WeeklySummaryCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-[#0B0F18] px-6 py-5 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="h-3 w-24 rounded-full bg-slate-800/80 animate-pulse" />
            <div className="h-3 w-40 rounded-full bg-slate-900/80 animate-pulse" />
          </div>
          <div className="h-3 w-56 rounded-full bg-slate-800/80 animate-pulse" />
        </div>
        <div className="h-3 w-full rounded-full bg-slate-900/80 animate-pulse mb-2" />
        <div className="h-3 w-3/4 rounded-full bg-slate-900/80 animate-pulse" />
      </section>
    );
  }

  if (error || !summary) {
    return (
      <section className="rounded-2xl border border-red-900/40 bg-[#0B0F18] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              Weekly Summary
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              We couldn&apos;t load this week&apos;s summary.{' '}
              <span className="text-slate-300">
                Try refreshing, or re-running the CLI sync.
              </span>
            </p>
          </div>
        </div>
      </section>
    );
  }

  const {
    range,
    headline,
    softStats,
    shipped,
    reviewsCollab,
    whereYouSpentTime,
    frictionFollowups,
  } = summary;

  const what = summary.whatYouWorkedOn;
  const focusTags = what?.focusAreas ?? [];
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#0B0F18] px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.85)]">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-slate-50">
            Weekly Summary
          </h2>
          <p className="text-xs font-medium text-slate-200/90 sm:text-sm">
            {headline}
          </p>
        </div>

        <p className="text-xs text-slate-400">{range.label ?? 'This week'}</p>
      </header>

      {/* Body layout: stack on mobile, 2-col on desktop */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left column: shipped + time + reviews */}
        <div className="space-y-4 text-sm text-slate-200">
          {/* Soft stats row */}
          <div className="mb-5 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <SoftStat label="PRs shipped" value={softStats.prsAuthored} />
            <SoftStat label="PRs reviewed" value={softStats.prsReviewed} />
            <SoftStat label="Active days" value={softStats.activeDays} />
            {softStats.mostActiveDay && (
              <SoftStat label="Most active" value={softStats.mostActiveDay} />
            )}
          </div>
          {(what?.textSummary ||
            shipped.length > 0 ||
            focusTags.length > 0) && (
            <section>
              <SectionLabel>What you worked on</SectionLabel>

              {/* High-level text summary */}
              {what?.textSummary && (
                <p className="mt-1 text-sm text-slate-300">
                  {what.textSummary}
                </p>
              )}

              {/* Focus areas (domains / skills) – optional, inline under summary */}

              {shipped.length > 0 && (
                <div className="mt-1">
                  <ul className="space-y-1.5">
                    {shipped.map((item) => (
                      <li key={item.prId} className="flex flex-col">
                        {/* PR number + title + summary */}
                        <div className="flex flex-wrap items-baseline gap-1 text-sm">
                          {/* PR number link */}
                          {item.htmlUrl && item.number && (
                            <a
                              href={item.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-300 hover:text-sky-200 transition-colors text-xs font-medium"
                            >
                              [#{item.number}]
                            </a>
                          )}

                          {/* Title */}
                          <span className="font-medium text-slate-50">
                            {item.title}
                          </span>

                          {/* Summary */}
                          <span className="text-slate-400">
                            – {item.shortSummary}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {focusTags.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {focusTags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Reviews & collaboration */}
          {reviewsCollab && (
            <section>
              <SectionLabel>Reviews & collaboration</SectionLabel>
              <p className="mt-1 text-sm text-slate-300">
                You reviewed{' '}
                <span className="font-medium text-slate-50">
                  {reviewsCollab.totalReviewed}
                </span>{' '}
                PR{reviewsCollab.totalReviewed === 1 ? '' : 's'} and were the
                first responder on{' '}
                <span className="font-medium text-slate-50">
                  {reviewsCollab.firstResponderCount}
                </span>
                .
              </p>
              {reviewsCollab.highlightedReview && (
                <p className="mt-1 text-sm text-slate-300">
                  Highlight:{' '}
                  <span className="font-medium text-slate-50">
                    {reviewsCollab.highlightedReview.title}
                  </span>{' '}
                  <span className="text-slate-400">
                    – {reviewsCollab.highlightedReview.shortSummary}
                  </span>
                </p>
              )}
            </section>
          )}
        </div>

        {/* Right column: friction + CTA */}
        <div className="flex flex-col justify-between">
          {frictionFollowups && frictionFollowups.items.length > 0 && (
            <section className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <SectionLabel>Friction & follow-ups</SectionLabel>
              <ul className="mt-1 space-y-1.5 text-sm text-slate-300">
                {frictionFollowups.items.map((item, idx) => (
                  <li key={item.id ?? idx} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-3 flex flex-col items-start sm:items-end gap-1">
            <p className="max-w-sm text-sm text-slate-500 text-left sm:text-right">
              Uses this whole weekly summary as your starting point. You can
              adjust the date range inside 1:1 prep.
            </p>

            <button
              type="button"
              onClick={onOpenOneOnOne}
              className="
      inline-flex items-center gap-1.5
      rounded-full border border-slate-700/60 
      bg-slate-900/50
      px-3 py-1.5
      text-xs font-medium text-sky-300
      shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]
      transition-colors duration-150
      hover:border-slate-600 hover:bg-slate-900/80 hover:text-sky-200
    "
            >
              Start 1:1 prep with this week
              <span className="text-sky-400">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
