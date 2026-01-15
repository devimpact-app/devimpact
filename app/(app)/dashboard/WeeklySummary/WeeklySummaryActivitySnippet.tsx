import type { WeeklyActivity } from '@/types/api/weekly-activity';
import { formatMinutes } from '@/lib/utils/date';

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
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/75">
      <span className="text-white/50">{label}</span>
      <span
        className={`font-medium ${muted ? 'text-white/60' : 'text-white/85'} tabular-nums`}
      >
        {value}
      </span>
    </span>
  );
}

export function WeeklySummaryActivitySnippet({
  activity,
}: {
  activity?: WeeklyActivity | null;
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
    <div className="mt-4 space-y-4">
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Potential follow-ups
          </div>

          <ul className="mt-2 space-y-1.5">
            {frictionPreview.map((item, idx) => (
              <li
                key={(item as any).id ?? idx}
                className="flex gap-2 text-[12px] text-white/65"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                <span className="leading-relaxed">{(item as any).text}</span>
              </li>
            ))}
          </ul>

          {frictionItems.length > frictionPreview.length ? (
            <div className="mt-2 text-[12px] text-white/45">
              +{frictionItems.length - frictionPreview.length} more
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
