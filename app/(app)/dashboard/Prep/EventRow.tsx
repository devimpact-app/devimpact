'use client';

import { useMemo, useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, FileText } from 'lucide-react';

import { UpcomingCalendarEvent, PrepMeetingType } from '@/types/api/prep';
import { formatUpcomingTime, getTimezone } from '@/lib/utils/date';

const SUPPORTED_TEAM_SUBTYPES = new Set([
  'standup',
  'planning',
  'retro',
] as const);

type PrepCta =
  | { kind: 'unsupported' }
  | { kind: 'open'; label: string; prepItemId: string }
  | { kind: 'create'; label: string; meetingType: PrepMeetingType };

function getMeetingTypeForEvent(
  e: UpcomingCalendarEvent
): PrepMeetingType | null {
  if (e.category === 'oneOnOne') return 'oneOnOne';

  // We only support these team subtypes for now
  if (
    e.category === 'team' &&
    e.categorySubtype &&
    SUPPORTED_TEAM_SUBTYPES.has(e.categorySubtype as any)
  ) {
    return e.categorySubtype as PrepMeetingType; // standup | planning | retro
  }

  return null;
}

function getCtaForEvent(e: UpcomingCalendarEvent): PrepCta {
  // If we already have a prep item for this event, we should open it
  if (e.prepItemId) {
    return {
      kind: 'open',
      label: 'Open prep',
      prepItemId: e.prepItemId,
    };
  }

  const mt = getMeetingTypeForEvent(e);
  if (!mt) return { kind: 'unsupported' };

  // Copy that matches your “engineer-y” vibe
  if (mt === 'oneOnOne')
    return { kind: 'create', label: 'Prep 1:1', meetingType: mt };
  if (mt === 'standup')
    return { kind: 'create', label: 'Prep standup', meetingType: mt };
  if (mt === 'planning')
    return { kind: 'create', label: 'Plan sprint', meetingType: mt };
  if (mt === 'retro')
    return { kind: 'create', label: 'Prep retro', meetingType: mt };

  return { kind: 'create', label: 'Prep', meetingType: mt };
}

async function createPrepItemForCalendarEvent(args: {
  calendarEventId: string;
  timezone: string;
}): Promise<{ prepItemId: string }> {
  const res = await fetch('/api/prep/items', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'calendar',
      calendarEventId: args.calendarEventId,
      timezone: args.timezone,
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || 'Failed to create prep item');
  }

  const json = await res.json();
  const prepItemId = json?.data?.prepItemId ?? json?.prepItemId;
  if (!prepItemId || typeof prepItemId !== 'string') {
    throw new Error('Invalid response from /api/prep/items');
  }

  return { prepItemId };
}

export function EventRow({
  event,
  detailHrefForPrepItemId = (id) => `/prep/${encodeURIComponent(id)}`,
}: {
  event: UpcomingCalendarEvent;
  detailHrefForPrepItemId?: (prepItemId: string) => string;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(
    () => formatUpcomingTime(event.startAtISO),
    [event.startAtISO]
  );
  const title = useMemo(
    () => event.title?.trim() || 'Untitled meeting',
    [event.title]
  );

  const cta = useMemo(() => getCtaForEvent(event), [event]);

  const isClickable = cta.kind !== 'unsupported' && !isWorking;

  async function handleOpenOrCreate(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    try {
      // Open existing prep if available
      if (cta.kind === 'open') {
        router.push(detailHrefForPrepItemId(cta.prepItemId));
        return;
      }

      // Create new prep
      if (cta.kind === 'create') {
        setIsWorking(true);
        const timezone = getTimezone();
        const { prepItemId } = await createPrepItemForCalendarEvent({
          calendarEventId: event.id,
          timezone,
        });
        router.push(detailHrefForPrepItemId(prepItemId));
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : -1}
      onClick={isClickable ? (e) => handleOpenOrCreate(e as any) : undefined}
      className={[
        'rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 flex items-center justify-between gap-3 transition',
        isClickable ? 'hover:bg-white/[0.05] cursor-pointer' : 'opacity-80',
      ].join(' ')}
    >
      <div className="min-w-0">
        <p className="text-[11px] text-white/45">{label}</p>
        <p className="text-sm text-white/85 font-medium truncate">{title}</p>

        {error && (
          <p className="mt-1 text-[11px] text-rose-300/90 truncate">{error}</p>
        )}
      </div>

      {cta.kind === 'unsupported' ? (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/50">
          No prep
        </span>
      ) : (
        <button
          type="button"
          onClick={handleOpenOrCreate}
          disabled={isWorking}
          className="
            inline-flex items-center gap-1
            rounded-full bg-[#1A2236]
            border border-white/10
            px-3 py-1.5
            text-[11px] font-medium text-white/80
            hover:bg-[#202A44] transition
            shrink-0
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {isWorking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
          ) : cta.kind === 'open' ? (
            <ArrowRight className="h-3.5 w-3.5 text-white/60" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-white/60" />
          )}
          {cta.label}
        </button>
      )}
    </div>
  );
}
