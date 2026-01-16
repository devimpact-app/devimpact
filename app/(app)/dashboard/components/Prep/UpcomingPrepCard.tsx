'use client';

import { UpcomingCalendarEvent } from '@/types/api/prep';
import { ArrowRight, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { EventRow } from './EventRow';
import { PrepDashboardQuickActions } from './QuickActions';
import { ActionButton } from '../../../../../components/ui/ActionButton';

type UpcomingPrepCardProps = {
  calendarConnected: boolean;
  events: UpcomingCalendarEvent[];
  isLoading?: boolean;
  error?: string | null;
  hideOpen?: boolean;
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

function CalendarConnectFooter() {
  return (
    <div
      className="
  flex items-center justify-between gap-4
  rounded-xl border border-white/10
  bg-[#0A0D14]
  px-4 py-3
"
    >
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-white/70">
          Connect calendar for automation
        </p>
        <p className="mt-0.5 text-[11px] text-white/40">
          Auto-prep scheduled meetings and pull better context. Read-only.
        </p>
      </div>

      <Link
        className="
    inline-flex h-8 items-center justify-center rounded-full
    border border-white/15 bg-white/[0.04]
    px-4 text-xs font-medium text-white/75
    hover:bg-white/[0.07] hover:border-white/25 transition
    shrink-0
  "
        href=""
      >
        Connect
      </Link>
    </div>
  );
}

function EmptyCalendarState({ hideOpen }: { hideOpen?: boolean }) {
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

      {!hideOpen && (
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
      )}
    </div>
  );
}

export function UpcomingPrepCard({
  calendarConnected,
  events,
  isLoading,
  error,
  hideOpen = false,
}: UpcomingPrepCardProps) {
  const hasEvents = events.length > 0;

  const prepHref = '/prep';
  const showEventList = calendarConnected && hasEvents && !isLoading && !error;
  return (
    <section
      className="
  relative overflow-hidden rounded-2xl border border-white/10
  bg-[#0D111A] px-5 py-4
  shadow-[0_20px_55px_rgba(0,0,0,0.55)]
"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/6 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      <div className="relative space-y-4">
        <header className="relative flex items-start justify-between gap-4">
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
                Create focused prep for standups and 1:1s from recent work.
              </p>
            </div>
          </div>

          {!hideOpen && (
            <ActionButton href={prepHref} variant="primary">
              View all prep <ArrowRight className="h-4 w-4" />
            </ActionButton>
          )}
        </header>

        {/* Body container (lighter border + less “box within box”) */}
        <div className="relative rounded-xl border border-[#272E3F] p-3">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : calendarConnected ? (
            !hasEvents ? (
              <EmptyCalendarState hideOpen={hideOpen} />
            ) : (
              <EventList events={events} />
            )
          ) : (
            <div
              className="
  rounded-xl border border-dashed border-white/10
  bg-white/[0.02]
  px-4 py-3
  text-[12px] text-white/45
"
            >
              Upcoming meetings appear here once your calendar is connected.
            </div>
          )}
        </div>

        {showEventList ? (
          <>
            {!hideOpen && (
              <PrepDashboardQuickActions
                disableActions={false}
                calendarConnected={calendarConnected}
                onOneOnOnePrepClick={() => {}}
                onStandupPrepClick={() => {}}
              />
            )}
          </>
        ) : (
          <>
            {!hideOpen && (
              <PrepDashboardQuickActions
                disableActions={false}
                calendarConnected={calendarConnected}
                onOneOnOnePrepClick={() => {}}
                onStandupPrepClick={() => {}}
              />
            )}

            {!calendarConnected && <CalendarConnectFooter />}
          </>
        )}
      </div>
    </section>
  );
}

function EventList({ events }: { events: UpcomingCalendarEvent[] }) {
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
