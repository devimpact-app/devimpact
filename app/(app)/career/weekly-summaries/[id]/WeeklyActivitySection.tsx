import { useState } from 'react';
import {
  User,
  Users,
  Building2,
  Briefcase,
  AlertTriangle,
  Target,
  Plane,
  Calendar,
  ChevronDown,
  Activity,
} from 'lucide-react';
import type {
  CalendarEventCategory,
  WeeklyActivity,
} from '@/types/api/weekly-activity';
import { formatMinutes } from '@/lib/utils/date';
import { TeamMeetingSubtype } from '@/types/api/prep';
import { ActivityEvent } from '@/types/api/timeline';

export const TEAM_MEETING_SUBTYPE_DISPLAY: Record<
  TeamMeetingSubtype,
  {
    label: string;
    short?: string;
  }
> = {
  standup: {
    label: 'Standup',
    short: 'Standup',
  },
  planning: {
    label: 'Planning',
    short: 'Plan',
  },
  retro: {
    label: 'Retrospective',
    short: 'Retro',
  },
  grooming: {
    label: 'Backlog grooming',
    short: 'Grooming',
  },
  demo: {
    label: 'Demo',
    short: 'Demo',
  },
  designReview: {
    label: 'Design review',
    short: 'Design',
  },
  architecture: {
    label: 'Architecture review',
    short: 'Arch',
  },
  status: {
    label: 'Status update',
    short: 'Status',
  },
  other: {
    label: 'Other',
    short: 'Other',
  },
};

export const CALENDAR_CATEGORY_DISPLAY: Record<
  CalendarEventCategory,
  {
    label: string;
    icon: React.ComponentType<{ size?: number }>;
  }
> = {
  personal: {
    label: 'Personal',
    icon: User,
  },
  ooo: {
    label: 'Out of office',
    icon: Plane,
  },
  focus: {
    label: 'Focus time',
    icon: Target,
  },
  oneOnOne: {
    label: '1:1',
    icon: User,
  },
  team: {
    label: 'Team meeting',
    icon: Users,
  },
  org: {
    label: 'Org meeting',
    icon: Building2,
  },
  interview: {
    label: 'Interview',
    icon: Briefcase,
  },
  incident: {
    label: 'Incident',
    icon: AlertTriangle,
  },
  other: {
    label: 'Other meeting',
    icon: Calendar,
  },
};

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
      <span className="text-white/55">{label}</span>
      <span
        className={`font-medium ${muted ? 'text-white/60' : 'text-white/85'} tabular-nums`}
      >
        {value}
      </span>
    </span>
  );
}

export function WeeklyActivitySection({
  activity,
  defaultOpen = true,
  onEventClick,
}: {
  activity?: WeeklyActivity | null;
  defaultOpen?: boolean;
  onEventClick: (event: ActivityEvent) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!activity) return null;

  const s = activity.softStats;
  const frictionItems = activity.frictionFollowups?.items ?? [];
  const calendar = activity.calendar;

  const hasAnyStats =
    !!s &&
    (typeof s.prsAuthored === 'number' ||
      typeof s.prsReviewed === 'number' ||
      typeof s.activeDays === 'number' ||
      !!s.mostActiveDay ||
      typeof s.meetingMinutes === 'number' ||
      typeof s.meetingCount === 'number');

  const hasAny = hasAnyStats || frictionItems.length > 0 || !!calendar;
  if (!hasAny) return null;

  return (
    <div className="mt-8 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-start justify-between gap-3 rounded-xl px-2 py-1 text-left transition"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <div className="text-sm font-medium text-white/80">
              This week at a glance
            </div>
          </div>
          <div className="mt-0.5 text-xs text-white/45">
            Aggregated metrics and trends from this week
          </div>
        </div>

        <ChevronDown
          className={[
            'h-4 w-4 shrink-0 text-white/45 transition',
            open ? 'rotate-180' : 'rotate-0',
            'group-hover:text-white/70',
          ].join(' ')}
        />
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
          {hasAnyStats ? (
            <div className="flex flex-wrap items-center gap-2">
              {typeof s.prsAuthored === 'number' ? (
                <StatPill label="PRs merged" value={s.prsAuthored} />
              ) : null}
              {typeof s.prsReviewed === 'number' ? (
                <StatPill label="Reviews" value={s.prsReviewed} />
              ) : null}
              {typeof s.activeDays === 'number' ? (
                <StatPill label="Coding days" value={s.activeDays} />
              ) : null}
              {s.mostActiveDay ? (
                <StatPill label="Most active" value={s.mostActiveDay} />
              ) : null}
            </div>
          ) : null}

          {calendar ? (
            <div className={hasAnyStats ? 'mt-4' : ''}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <Calendar className="h-3.5 w-3.5" />
                Calendar
              </div>

              <div className="mt-2 pb-1 text-[13px] text-white/65">
                {typeof calendar.meetingCount === 'number' ? (
                  <>
                    {calendar.meetingCount} meeting
                    {calendar.meetingCount === 1 ? '' : 's'}
                  </>
                ) : (
                  <>Meetings</>
                )}
                {typeof calendar.meetingMinutes === 'number' ? (
                  <>
                    <span className="mx-2 text-white/25">·</span>
                    {formatMinutes(calendar.meetingMinutes)}
                  </>
                ) : null}
                {typeof calendar.deepWorkBlocksCount === 'number' ? (
                  <>
                    <span className="mx-2 text-white/25">·</span>
                    {calendar.deepWorkBlocksCount} deep work block
                    {calendar.deepWorkBlocksCount === 1 ? '' : 's'}
                  </>
                ) : null}
              </div>

              {calendar.categories?.length ? (
                <div className="mt-2 grid gap-1">
                  {calendar.categories.slice(0, 4).map((c) => {
                    const subs = (c.subcategories ?? []).slice(0, 2);
                    const subLabel =
                      subs.length > 0
                        ? subs
                            .map(
                              (s) => TEAM_MEETING_SUBTYPE_DISPLAY[s].short ?? s
                            )
                            .join(', ')
                        : null;

                    const remaining =
                      (c.subcategories?.length ?? 0) - subs.length;

                    const categoryInfo = CALENDAR_CATEGORY_DISPLAY[c.key];
                    const Icon = categoryInfo.icon;

                    return (
                      <div
                        key={c.key}
                        className="flex items-center justify-between rounded-lg px-2 py-1 text-[13px] text-white/6"
                      >
                        <div className="min-w-0 truncate flex flex-row items-center gap-1">
                          <Icon size={14} />
                          <span className="ml-1 text-white/80">
                            {categoryInfo.label}
                          </span>
                          <span className="text-white/55"> · {c.count}</span>

                          {subLabel ? (
                            <span className="text-white/50">
                              {' '}
                              · {subLabel}
                              {remaining > 0 ? ` (+${remaining})` : ''}
                            </span>
                          ) : null}
                        </div>

                        <div className="shrink-0 tabular-nums text-white/80">
                          {formatMinutes(c.minutes ?? 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {frictionItems.length ? (
            <div className={hasAnyStats || calendar ? 'mt-4' : ''}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
                <Activity className="h-3.5 w-3.5" />
                Potential follow-ups
              </div>

              <ul className="mt-2">
                {frictionItems.map((item, idx) => {
                  const pr = item.relatedPr;
                  const repo = pr?.meta?.repoFullName;
                  const num = pr?.meta?.prNumber;

                  return (
                    <li key={(item as any).id ?? idx}>
                      <button
                        className={[
                          'group w-full flex gap-2 rounded-lg px-2 py-1',
                          'text-[13px] text-white/65',
                          'hover:bg-white/[0.04] hover:text-white/80',
                          'focus:outline-none focus:ring-2 focus:ring-white/15',
                          'transition',
                        ].join(' ')}
                        onClick={() =>
                          item.relatedPr ? onEventClick(item.relatedPr) : null
                        }
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/25 group-hover:bg-white/45" />
                        <span className="min-w-0">
                          <span className="leading-relaxed">
                            {repo && num ? (
                              <span className="text-white/45">
                                {repo} #{num}:{' '}
                              </span>
                            ) : null}
                            {(item as any).text}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
