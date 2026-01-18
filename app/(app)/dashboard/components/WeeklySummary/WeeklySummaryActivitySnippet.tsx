import type { WeeklyActivity } from '@/types/api/weekly-activity';
import { formatMinutes } from '@/lib/utils/date';
import Link from 'next/link';

function dot() {
  return (
    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/15" />
  );
}

function StatPill({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/75">
      <span className="text-white/50">{label}</span>
      <span
        className={`font-medium ${muted ? 'text-white/80' : 'text-white/85'} tabular-nums`}
      >
        {value}
      </span>
    </span>
  );
}

export function WeeklySummaryActivitySnippet({
  activity,
  summaryId,
}: {
  activity?: WeeklyActivity | null;
  summaryId: string;
}) {
  if (!activity) return null;

  const s = activity.softStats;

  const meetingMinutes = s?.meetingMinutes ?? null;
  const meetingCount = s?.meetingCount ?? null;

  const frictionItems = activity.frictionFollowups?.items ?? [];
  const frictionPreview = frictionItems.slice(0, 2);

  const hasAny =
    !!s &&
    (typeof s.prsAuthored === 'number' ||
      typeof s.prsReviewed === 'number' ||
      typeof s.activeDays === 'number' ||
      !!s.mostActiveDay ||
      typeof meetingMinutes === 'number' ||
      typeof meetingCount === 'number');

  if (!hasAny && frictionPreview.length === 0) return null;

  return (
    <div className="mt-5 space-y-4">
      {hasAny ? (
        <div className="flex flex-wrap items-center gap-2">
          {typeof s.prsAuthored === 'number' ? (
            <StatPill label="PRs merged" value={s.prsAuthored} />
          ) : null}

          {typeof s.prsReviewed === 'number' ? (
            <StatPill label="Reviews" value={s.prsReviewed} />
          ) : null}

          {typeof s.activeDays === 'number' ? (
            <StatPill label="Coding days" value={s.activeDays} muted />
          ) : null}

          {s.mostActiveDay ? (
            <StatPill label="Most active" value={s.mostActiveDay} muted />
          ) : null}

          {typeof meetingMinutes === 'number' ? (
            <StatPill
              label="Meeting load"
              value={formatMinutes(meetingMinutes)}
              muted
            />
          ) : null}
        </div>
      ) : null}

      {frictionPreview.length > 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
            Potential follow-ups
          </div>

          <ul className="space-y-1.5">
            {frictionPreview.map((item, idx) => {
              const pr = item.relatedPr;
              const href = `/career/weekly-summaries/${summaryId}`;

              return (
                <li key={item.id ?? idx}>
                  <Link
                    href={href}
                    className={[
                      'group flex gap-2 rounded-md px-2 py-1.5',
                      'text-[13px] text-white/70',
                      'hover:bg-white/[0.04] hover:text-white/80',
                      'focus:outline-none focus:ring-2 focus:ring-white/15',
                      'transition',
                    ].join(' ')}
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30 group-hover:bg-white/50" />
                    {pr?.meta?.repoFullName && pr?.meta?.prNumber ? (
                      <span className="ml-1 text-white/50">
                        ({pr.meta.repoFullName} #{pr.meta.prNumber})
                      </span>
                    ) : null}
                    <span className="leading-relaxed">{item.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {frictionItems.length > frictionPreview.length ? (
            <div className="mt-2 text-xs text-white/45">
              +{frictionItems.length - frictionPreview.length} more
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
