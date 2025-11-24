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
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {/* Left: title + headline + soft stats */}
        <div className="space-y-2">
          <div>
            <h2 className=" font-semibold text-slate-50">Weekly Summary</h2>
            <p className="text-xs text-slate-400">{range.label}</p>
          </div>

          {/* headline */}
          <p className="max-w-xl text-sm text-slate-200/90">{headline}</p>

          <div className="mb-5 mt-2 flex flex-wrap items-start gap-x-3 gap-y-2">
            <SoftStat
              label="PRs shipped"
              value={softStats.prsAuthored}
              isFirst
            />
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-700" />
            <SoftStat label="PRs reviewed" value={softStats.prsReviewed} />
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-700" />
            <SoftStat label="Active days" value={softStats.activeDays} />
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-700" />
            {softStats.mostActiveDay && (
              <SoftStat label="Most active" value={softStats.mostActiveDay} />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col items-start sm:items-end gap-1">
          <button
            type="button"
            onClick={onOpenOneOnOne}
            className="
                rounded-full 
                px-3 py-1.5
                text-xs font-medium
                text-indigo-300
                border border-indigo-400/30
                hover:border-indigo-400/60
                hover:bg-indigo-500/10
                transition-colors
              "
          >
            Start 1:1 prep with this week
            <span className="text-sky-400">→</span>
          </button>
          <p className="max-w-sm text-sm text-slate-500 text-left sm:text-right">
            Uses this whole weekly summary as your starting point. You can
            adjust the date range inside 1:1 prep.
          </p>
        </div>
      </header>

      {/* Body layout: stack on mobile, 2-col on desktop */}
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left column: shipped + time + reviews */}
        <div className="space-y-4 text-sm text-slate-200">
          {(what?.textSummary ||
            shipped.length > 0 ||
            focusTags.length > 0) && (
            <section>
              <SectionLabel>What you worked on</SectionLabel>

              {/* High-level text summary */}
              {what?.textSummary && (
                <p className="mt-1.5 max-w-2xl text-sm text-slate-300">
                  {what.textSummary}
                </p>
              )}

              {/* Highlighted shipped PRs */}
              {shipped.length > 0 && (
                <div
                  className={
                    what?.textSummary
                      ? 'mt-3 border-t border-slate-800/60 pt-3'
                      : 'mt-2'
                  }
                >
                  <ul className="space-y-1.5">
                    {shipped.map((item) => (
                      <li key={item.prId} className="flex">
                        {/* subtle vertical marker for visual rhythm */}
                        <span className="mt-1 h-3 w-px rounded-full bg-slate-800/80" />

                        <div className="flex flex-1 flex-col">
                          <div className="flex flex-row items-baseline text-[13px]">
                            {/* PR number pill */}
                            {item.htmlUrl && item.number && (
                              <a
                                href={item.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="
                                  rounded-full 
                                  border border-indigo-400/30 
                                  bg-indigo-500/10 
                                  text-indigo-300 
                                  hover:border-indigo-300/50
                                  hover:text-indigo-200
                                  transition-colors
                                  px-1.5 py-0.5 
                                  text-[10px] 
                                  font-medium 
                                  uppercase 
                                  tracking-wide
                                "
                              >
                                #{item.number}
                              </a>
                            )}
                            <span className="text-slate-400 ml-2">
                              <span className="font-semibold text-slate-100 mr-1">
                                {item.title}:
                              </span>
                              {item.shortSummary}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Focus areas */}
              {focusTags.length > 0 && (
                <div className={shipped.length > 0 ? 'mt-3' : 'mt-2'}>
                  <SectionLabel>Focus Areas</SectionLabel>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
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
        </div>
        {/* Right column: friction + CTA */}
        <div className="flex flex-col space-y-4">
          {reviewsCollab && (
            <section className="">
              <SectionLabel>Reviews & collaboration</SectionLabel>

              {/* High-level summary */}
              <p className="mt-1 text-sm text-slate-300">
                You reviewed {reviewsCollab.totalReviewed}{' '}
                {reviewsCollab.totalReviewed === 1 ? 'PR' : 'PRs'} and were the
                first responder on {reviewsCollab.firstResponderCount}.
              </p>

              {reviewsCollab.highlightedReview && (
                <div className="mt-4 border-l border-slate-700/70 pl-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                    Highlight
                  </p>

                  <div className="flex items-baseline gap-2">
                    {reviewsCollab.highlightedReview.number && (
                      <a
                        href={reviewsCollab.highlightedReview.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-sky-300 hover:text-sky-200"
                      >
                        #{reviewsCollab.highlightedReview.number}
                      </a>
                    )}
                    <span className="text-sm font-medium text-slate-200">
                      {reviewsCollab.highlightedReview.title}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {reviewsCollab.highlightedReview.shortSummary}
                  </p>
                </div>
              )}
            </section>
          )}

          {frictionFollowups && frictionFollowups.items.length > 0 && (
            <>
              <div className="my-5 h-px w-full bg-slate-800/50" />
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
