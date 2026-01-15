'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  Clock,
  Tag,
  Users,
  CheckCircle2,
  CircleSlash,
  HelpCircle,
  X,
  FileText,
} from 'lucide-react';
import { UpcomingCalendarEvent } from '@/types/api/prep';

function formatTimeRange(startISO: string, endISO: string, isAllDay: boolean) {
  const start = new Date(startISO);
  const end = new Date(endISO);

  if (isAllDay) {
    return start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  const date = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const startTime = start.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const endTime = end.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${date} · ${startTime}–${endTime}`;
}

function durationLabel(e: UpcomingCalendarEvent) {
  if (e.isAllDay) return 'All day';
  const mins =
    e.durationMinutes ??
    Math.max(
      0,
      Math.round((Date.parse(e.endAtISO) - Date.parse(e.startAtISO)) / 60000)
    );
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function labelForCategory(e: UpcomingCalendarEvent) {
  const base = e.category;

  if (base === 'oneOnOne') return '1:1';
  if (base === 'team')
    return e.categorySubtype
      ? `Team · ${subtypeLabel(e.categorySubtype)}`
      : 'Team meeting';
  if (base === 'org') return 'Org meeting';
  if (base === 'incident') return 'Incident';
  if (base === 'interview') return 'Interview';
  if (base === 'ooo') return 'Out of office';
  if (base === 'focus') return 'Focus';
  if (base === 'personal') return 'Personal';
  return 'Other';
}

function subtypeLabel(subtype: string) {
  switch (subtype) {
    case 'standup':
      return 'Standup';
    case 'planning':
      return 'Planning';
    case 'retro':
      return 'Retro';
    case 'grooming':
      return 'Grooming';
    case 'demo':
      return 'Demo';
    case 'designReview':
      return 'Design review';
    case 'architecture':
      return 'Architecture';
    case 'status':
      return 'Status';
    default:
      return 'Other';
  }
}

function rsvpLabel(status?: string | null) {
  switch (status) {
    case 'accepted':
      return {
        label: 'Accepted',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      };
    case 'declined':
      return {
        label: 'Declined',
        icon: <CircleSlash className="h-3.5 w-3.5" />,
      };
    case 'tentative':
      return {
        label: 'Tentative',
        icon: <HelpCircle className="h-3.5 w-3.5" />,
      };
    case 'needsAction':
      return {
        label: 'Needs action',
        icon: <HelpCircle className="h-3.5 w-3.5" />,
      };
    default:
      return { label: 'RSVP', icon: <HelpCircle className="h-3.5 w-3.5" /> };
  }
}

function isPrepSupported(e: UpcomingCalendarEvent) {
  if (e.category === 'oneOnOne') return true;
  if (e.category === 'team') {
    return (
      e.categorySubtype === 'standup' ||
      e.categorySubtype === 'planning' ||
      e.categorySubtype === 'retro'
    );
  }
  return false;
}

function defaultMeetingTypeForEvent(
  e: UpcomingCalendarEvent
): 'oneOnOne' | 'standup' | 'planning' | 'retro' | null {
  if (e.category === 'oneOnOne') return 'oneOnOne';
  if (e.category === 'team') {
    if (e.categorySubtype === 'standup') return 'standup';
    if (e.categorySubtype === 'planning') return 'planning';
    if (e.categorySubtype === 'retro') return 'retro';
  }
  return null;
}

type CreatePrepState = 'idle' | 'loading' | 'error';

function InspectorOutline({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className="
        fixed right-0 top-0 bottom-0 w-full max-w-[320px]
        bg-surface-alt border-l border-border
        shadow-2xl z-50 animate-slideIn
        flex flex-col px-4 py-3
      "
      aria-label="Calendar event inspector"
    >
      {children}
    </aside>
  );
}

export function CalendarEventInspectorPanel({
  event,
  onClose,
  isLoading,
}: {
  event?: UpcomingCalendarEvent;
  onClose: () => void;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const [createState, setCreateState] = useState<CreatePrepState>('idle');

  const eventInPast = useMemo(() => {
    const endAt = event ? new Date(event.endAtISO) : new Date();
    const now = new Date();
    return endAt < now;
  }, [event?.endAtISO]);

  const confidenceLabel = useMemo(() => {
    const c = event?.categoryConfidence;
    if (!c) return null;
    if (c >= 0.85) return 'High';
    if (c >= 0.6) return 'Medium';
    return 'Low';
  }, [event?.categoryConfidence]);

  if (isLoading) {
    return (
      <InspectorOutline>
        <div className="animate-pulse rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-5/6 rounded bg-white/10" />
            <div className="h-3 w-4/6 rounded bg-white/10" />
          </div>
        </div>
      </InspectorOutline>
    );
  }

  if (!event) return null;

  const buttonText = eventInPast ? 'Reflect meeting' : 'Prepare meeting';
  const title = (event.title ?? '').trim() || 'Untitled meeting';
  const timeLabel = formatTimeRange(
    event.startAtISO,
    event.endAtISO,
    event.isAllDay
  );
  const dur = durationLabel(event);

  const categoryLabel = labelForCategory(event);
  const rsvp = rsvpLabel(event.selfResponseStatus ?? null);

  const prepSupported = isPrepSupported(event);
  const meetingType = defaultMeetingTypeForEvent(event);
  const hasPrep = !!event.prepItemId;

  async function handlePrepAction() {
    if (event?.prepItemId) {
      router.push(`/prep/items/${event.prepItemId}`);
      return;
    }

    if (!event || !prepSupported || !meetingType) return;

    try {
      setCreateState('loading');
      const res = await fetch('/api/prep/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source: 'calendar',
          calendarEventId: event.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      });

      if (!res.ok) throw new Error('Failed to create prep item');
      const { data } = await res.json();

      const id = data?.id as string | undefined;
      if (!id) throw new Error('Missing id');

      router.push(`/prep/items/${id}`);
    } catch (err) {
      console.error(err);
      setCreateState('error');
    } finally {
      setCreateState('idle');
    }
  }

  return (
    <InspectorOutline>
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-[2px] text-[11px] text-text-secondary bg-surface/80">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>{categoryLabel}</span>
            </span>

            {dur && (
              <span className="text-[11px] text-text-tertiary">{dur}</span>
            )}
          </div>

          <span className="text-[11px] text-text-tertiary">{timeLabel}</span>
        </div>

        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-surface/80 ml-2"
          aria-label="Close inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-6 space-y-0.5">
        <h2 className="text-sm font-semibold text-text-primary line-clamp-2">
          {title}
        </h2>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-[2px] text-[11px] text-text-secondary">
            <Tag className="h-3.5 w-3.5" />
            {event.categorySubtype ? subtypeLabel(event.categorySubtype) : '—'}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-[2px] text-[11px] text-text-secondary">
            {rsvp.icon}
            {rsvp.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 space-y-4">
        {prepSupported ? (
          <button
            type="button"
            onClick={handlePrepAction}
            disabled={createState === 'loading'}
            className="
              inline-flex w-full items-center justify-center gap-2 rounded-lg
              border border-border bg-surface hover:bg-surface-alt
              text-xs font-medium text-text-primary px-3 py-2 transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            <FileText className="h-3.5 w-3.5 text-text-secondary" />
            {hasPrep
              ? 'Open prep'
              : createState === 'loading'
                ? 'Creating…'
                : buttonText}
          </button>
        ) : (
          <div className="rounded-lg border border-border bg-surface/60 px-3 py-2">
            <p className="text-xs text-text-secondary">
              Prep isn’t supported for this meeting type yet.
            </p>
          </div>
        )}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
            Prep
          </h3>

          <div className="rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-text-primary">
                  {hasPrep ? 'Prep item exists' : 'No prep item yet'}
                </div>
                <div className="text-[11px] text-text-tertiary">
                  {hasPrep
                    ? 'This meeting has an attached prep draft.'
                    : prepSupported
                      ? 'Create one when you’re ready.'
                      : 'Supported for 1:1 and standups'}
                </div>
              </div>

              {hasPrep ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-[2px] text-[11px] text-text-secondary shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Linked
                </span>
              ) : null}
            </div>

            {createState === 'error' ? (
              <p className="mt-2 text-[11px] text-text-secondary">
                Couldn’t create prep right now. Try again in a moment.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
            Attendees
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
              <dt className="text-[11px] text-text-tertiary flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Total
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                {event.attendeesTotal ?? 0}
              </dd>
            </div>

            <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
              <dt className="text-[11px] text-text-tertiary">Accepted</dt>
              <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                {event.attendeesAccepted ?? 0}
              </dd>
            </div>

            <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
              <dt className="text-[11px] text-text-tertiary">Declined</dt>
              <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                {event.attendeesDeclined ?? 0}
              </dd>
            </div>

            <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
              <dt className="text-[11px] text-text-tertiary">Needs action</dt>
              <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                {event.attendeesNeedsAction ?? 0}
              </dd>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
            Classification
          </h3>

          <div className="text-xs text-text-secondary space-y-1 rounded-lg border border-border bg-surface/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-tertiary">Category</span>
              <span className="text-text-primary">{event.category}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-text-tertiary">Subtype</span>
              <span className="text-text-primary">
                {event.categorySubtype ? String(event.categorySubtype) : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-text-tertiary">Confidence</span>
              <span className="text-text-primary">
                {confidenceLabel ?? '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-text-tertiary">Source</span>
              <span className="text-text-primary">
                {event.categorySource ?? '—'}
              </span>
            </div>

            {event.isOrganizerSelf ? (
              <div className="pt-1 text-[11px] text-text-tertiary">
                You’re the organizer.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </InspectorOutline>
  );
}
