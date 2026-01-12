import {
  CalendarEventCategory,
  WeeklyActivity,
} from '@/types/api/weekly-activity';
import { SoftStat } from './SoftStat';
import { formatMinutes } from '@/lib/utils/date';
import { ChevronRight } from 'lucide-react';

type WeeklyActivityCardProps = {
  summary?: WeeklyActivity;
  isLoading?: boolean;
  error?: string | null;
  handleOneOnOne: () => void;
};

const CALENDAR_EVENT_CATEGORY_LABELS: Record<CalendarEventCategory, string> = {
  oneOnOne: '1:1s',
  team: 'Team meetings',
  org: 'Org-wide',
  interview: 'Interviews',
  incident: 'Incidents',
  focus: 'Focus time',
  ooo: 'Out of office',
  personal: 'Personal',
  other: 'Other',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </h3>
  );
}

function prettyCategory(key: CalendarEventCategory): string {
  return CALENDAR_EVENT_CATEGORY_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function WeeklyActivityCard({
  summary,
  isLoading,
  error,
  handleOneOnOne,
}: WeeklyActivityCardProps) {
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
              This Week at a Glance
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
    calendar,
  } = summary;

  const what = summary.whatYouWorkedOn;
  const focusTags = what?.focusAreas ?? [];
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#0B0F18] px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.85)]">
      <header className="flex items-center justify-between">
        <div>
          <h2 className=" font-semibold text-slate-50">
            This Week at a Glance
          </h2>
          <p className="text-xs text-slate-400">{range.label}</p>
        </div>
        <button
          type="button"
          onClick={() => {}}
          className="
            text-[11px] text-indigo-300
            hover:underline inline-flex items-center gap-1
          "
        >
          View other summaries
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4 text-sm text-slate-200">
          <p className="max-w-xl text-sm text-slate-200/90">{headline}</p>

          <div className="mb-5 mt-2 flex flex-wrap items-start gap-x-3 gap-y-2">
            <SoftStat
              label="PRs shipped"
              value={softStats.prsAuthored}
              isFirst
            />
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-700" />
            <SoftStat label="Active days" value={softStats.activeDays} />
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-700" />
            {softStats.mostActiveDay && (
              <SoftStat label="Most active" value={softStats.mostActiveDay} />
            )}
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-700" />
            {softStats.meetingMinutes && (
              <SoftStat
                label="Meeting load"
                value={formatMinutes(softStats.meetingMinutes)}
              />
            )}
          </div>
          {(what?.textSummary ||
            shipped.length > 0 ||
            focusTags.length > 0) && (
            <section>
              <SectionLabel>What you worked on</SectionLabel>

              {what?.textSummary && (
                <p className="mt-1.5 max-w-2xl text-sm text-slate-300">
                  {what.textSummary}
                </p>
              )}

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
        <div className="flex flex-col space-y-4">
          {reviewsCollab && (
            <section className="">
              <SectionLabel>Reviews & collaboration</SectionLabel>

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

          {calendar && (
            <section className="">
              <SectionLabel>Calendar & meetings</SectionLabel>

              <p className="mt-1 text-sm text-slate-300">
                You had {calendar.meetingCount}{' '}
                {calendar.meetingCount === 1 ? 'meeting' : 'meetings'} totaling{' '}
                {formatMinutes(calendar.meetingMinutes)}.
                {typeof calendar.deepWorkBlocksCount === 'number' ? (
                  <>
                    {' '}
                    You had {calendar.deepWorkBlocksCount}{' '}
                    {calendar.deepWorkBlocksCount === 1
                      ? 'deep work block'
                      : 'deep work blocks'}{' '}
                    available.
                  </>
                ) : null}
              </p>

              {calendar.categories && calendar.categories.length > 0 && (
                <div className="mt-4 border-l border-slate-700/70 pl-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                    Breakdown
                  </p>

                  <div className="space-y-2">
                    {calendar.categories.map((c) => (
                      <div
                        key={c.key}
                        className="flex items-center justify-between"
                      >
                        <div className="text-sm text-slate-200">
                          {prettyCategory(c.key)}
                          <span className="text-slate-500">
                            {' '}
                            · {c.count} {c.count === 1 ? 'event' : 'events'}
                          </span>
                        </div>

                        <div className="text-sm text-slate-400 tabular-nums">
                          {formatMinutes(c.minutes ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {frictionFollowups && frictionFollowups.items.length > 0 && (
            <>
              <div className="mt-5 h-px w-full bg-slate-800/50" />
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
