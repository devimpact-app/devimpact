'use client';

import { formatUpcomingTime } from '@/lib/utils/date';
import { UpcomingCalendarEvent } from '@/types/api/prep';
import { Calendar, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

type UpcomingPrepCardProps = {
  calendarConnected: boolean;
  events: UpcomingCalendarEvent[];
  isLoading?: boolean;
  error?: string | null;
};

function LoadingState() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-40 rounded bg-white/10 animate-pulse" />
      <div className="h-10 rounded-lg border border-white/5 bg-white/5 animate-pulse" />
      <div className="h-10 rounded-lg border border-white/5 bg-white/5 animate-pulse" />
      <div className="h-10 rounded-lg border border-white/5 bg-white/5 animate-pulse" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="
          h-8 w-8 rounded-lg
          border border-red-500/30 bg-red-500/10
          flex items-center justify-center
          shrink-0
        "
      >
        <span className="text-red-200 text-xs font-semibold">!</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-red-200/90 font-medium">
          Couldn’t load upcoming meetings
        </p>
        <p className="text-[11px] text-red-200/60 mt-1 leading-snug">
          {message}
        </p>
      </div>
    </div>
  );
}

function DisconnectedState() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-white/85 font-medium">
          Connect your calendar to enable meeting prep
        </p>
        <p className="mt-1 text-[11px] text-white/45 leading-snug">
          We use read-only access to understand your meeting load and prepare
          context automatically.
        </p>
      </div>

      <Link
        href="/settings/integrations/google"
        className="
          inline-flex h-9 items-center justify-center
          rounded-full bg-sky-500 px-4
          text-xs font-medium text-slate-950
          hover:bg-sky-400 transition
          shrink-0
        "
      >
        Connect calendar
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-white/85 font-medium">
          No meetings coming up
        </p>
        <p className="mt-1 text-[11px] text-white/45 leading-snug">
          If something lands on your calendar, it’ll show up here with a prep
          shortcut.
        </p>
      </div>

      <Link
        href="/prep"
        className="
          inline-flex h-9 items-center justify-center
          rounded-full border border-white/10 bg-white/5 px-4
          text-xs font-medium text-white/80
          hover:bg-white/8 transition
          shrink-0
        "
      >
        Open prep
      </Link>
    </div>
  );
}

export function UpcomingPrepCard({
  calendarConnected,
  events,
  isLoading,
  error,
}: UpcomingPrepCardProps) {
  const hasEvents = events.length > 0;
  return (
    <section
      className="
          rounded-2xl border border-white/10
          bg-[#111520]
          px-5 py-4
          flex flex-col gap-3
          w-full
        "
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="
                h-8 w-8 flex items-center justify-center
                rounded-lg bg-[#181E2A] border border-white/10
                mt-0.5
              "
          >
            <Calendar className="h-4 w-4 text-white/70" />
          </div>

          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-white/90 tracking-tight">
              Prepare for upcoming meetings
            </h3>
            <p className="text-[11px] text-white/45 leading-snug">
              Calendar-aware prep that pulls in relevant work context.
            </p>
          </div>
        </div>

        <Link
          href="/prep"
          className="
              text-[11px] text-[#7EA6F8]
              hover:underline inline-flex items-center gap-1
              shrink-0
            "
        >
          Open prep
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Body */}
      <div className="rounded-xl border border-white/5 bg-[#0C101A] p-3">
        {/* Loading */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : !calendarConnected ? (
          <DisconnectedState />
        ) : !hasEvents ? (
          <EmptyState />
        ) : (
          <EventList events={events} />
        )}
      </div>
    </section>
  );
}

function EventList({ events }: { events: UpcomingCalendarEvent[] }) {
  // show up to 3, time-first, one CTA each
  const items = events.slice(0, 3);

  return (
    <div className="flex flex-col gap-2">
      {items.map((e) => (
        <EventRow key={e.id} event={e} />
      ))}

      {events.length > 3 ? (
        <div className="pt-1">
          <Link
            href="/prep"
            className="text-[11px] text-white/45 hover:text-white/65 transition"
          >
            + {events.length - 3} more
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function EventRow({ event }: { event: UpcomingCalendarEvent }) {
  const label = formatUpcomingTime(event.startAtISO);
  const title = event.title?.trim() || 'Untitled meeting';

  const cta = ctaForEvent(event);

  return (
    <div
      className="
        rounded-lg border border-white/5
        bg-white/[0.03]
        px-3 py-2
        flex items-center justify-between gap-3
        hover:bg-white/[0.05] transition
      "
    >
      <div className="min-w-0">
        <p className="text-[11px] text-white/45">{label}</p>
        <p className="text-sm text-white/85 font-medium truncate">{title}</p>
      </div>

      <Link
        href={cta.href}
        className="
          inline-flex items-center gap-1
          rounded-full bg-[#1A2236]
          border border-white/10
          px-3 py-1.5
          text-[11px] font-medium text-white/80
          hover:bg-[#202A44] transition
          shrink-0
        "
      >
        <Sparkles className="h-3.5 w-3.5 text-white/60" />
        {cta.label}
      </Link>
    </div>
  );
}

function ctaForEvent(e: UpcomingCalendarEvent): {
  label: string;
  href: string;
} {
  const baseHref = `/prep?eventId=${encodeURIComponent(e.id)}`;

  if (e.category === 'oneOnOne')
    return { label: 'Prepare 1:1', href: baseHref };
  if (e.categorySubtype === 'standup')
    return { label: 'Prep standup', href: baseHref };
  if (e.categorySubtype === 'planning')
    return { label: 'Review capacity', href: baseHref };
  if (e.categorySubtype === 'retro')
    return { label: 'Prep retro', href: baseHref };

  return { label: 'Prepare', href: baseHref };
}
