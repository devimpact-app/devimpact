'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Insight } from '@/types/api/insights';
import { InsightPanel } from '@/components/insights/InsightPanel';
import { MetricPanel } from '@/components/metrics/MetricPanel';
import { ActivityEvent } from '@/types/api/timeline';
import { EventInspectorPanel } from '@/app/(app)/timeline/components/EventInspectorPanel';
import { getTimezone } from '@/lib/utils/date';
import { PrepHeader } from './Header';
import {
  PrepItemResponse,
  PrepMetricSnapshot,
  UpcomingCalendarEvent,
} from '@/types/api/prep';
import { PrepBody } from './PrepBody';
import { CalendarEventInspectorPanel } from '../../timeline/components/CalendarEventPanel';

type Status = 'loading' | 'ready' | 'error' | 'not_found';

const HeaderSkeleton = () => (
  <div className="sticky top-0 z-20 bg-background pt-5 pb-3 border-b border-white/10">
    <div className="flex items-start justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-slate-800/80" />
        <div className="h-6 w-64 rounded bg-slate-800" />
        <div className="h-3 w-80 max-w-[60vw] rounded bg-slate-900" />
      </div>
      <div className="h-8 w-28 rounded-full bg-slate-800/80" />
    </div>
  </div>
);

const BodySkeleton = () => (
  <div className="pb-8 pt-10 space-y-4 animate-pulse">
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-3"
        >
          <div className="h-3 w-20 rounded-full bg-slate-800/80" />
          <div className="h-4 w-3/4 rounded bg-slate-800" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full rounded bg-slate-900" />
            <div className="h-3 w-5/6 rounded bg-slate-900" />
            <div className="h-3 w-2/3 rounded bg-slate-900" />
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-3">
      <div className="h-3 w-24 rounded-full bg-slate-800/80" />
      <div className="h-3 w-2/3 rounded bg-slate-900" />
      <div className="h-3 w-1/2 rounded bg-slate-900" />
    </div>
  </div>
);

const ProblemState = ({ title, body }: { title: string; body: string }) => {
  const router = useRouter();
  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6 lg:px-8 pt-8">
      <button
        type="button"
        onClick={() => router.push('/prep')}
        className="mb-4 inline-flex items-center gap-1.5 self-start rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-900 hover:text-slate-50 transition-colors"
      >
        {/* simple chevron using &larr; to avoid extra import */}
        <span className="text-xs">&larr;</span>
        <span>Back to prep</span>
      </button>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-6 py-6 shadow-sm shadow-black/40 max-w-xl">
        <h1 className="text-sm font-semibold text-slate-50">{title}</h1>
        <p className="mt-2 text-xs text-slate-400">{body}</p>
      </div>
    </main>
  );
};

export default function PrepDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [prep, setPrep] = useState<PrepItemResponse['prep'] | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [selectedMetric, setSelectedMetric] =
    useState<PrepMetricSnapshot | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(
    null
  );
  const [selectedCalendarEvent, setSelectedCalendarEvent] =
    useState<UpcomingCalendarEvent | null>(null);

  const hasTriggeredGeneration = useRef(false);

  useEffect(() => {
    let pollTimeout: NodeJS.Timeout;
    let isActive = true;

    async function load() {
      try {
        if (!id) {
          setStatus('not_found');
          return;
        }

        const res = await fetch(`/api/prep/items/${id}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 404) {
            setStatus('not_found');
          } else {
            setStatus('error');
            const text = await res.text().catch(() => '');
            setErrorMessage(text || 'Failed to load this 1:1 prep.');
          }
          return;
        }

        const { data } = await res.json();
        setPrep(data.prep);

        if (data.prep.status === 'pending' && !hasTriggeredGeneration.current) {
          hasTriggeredGeneration.current = true;
          fetch(`/api/prep/items/${id}/generate`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }).catch((err) => {
            console.error('Failed to trigger generation:', err);
            setStatus('error');
            setErrorMessage('Failed to generate talking points.');
          });

          setStatus('loading');
        }

        // Check if still generating
        if (
          data.prep.status === 'pending' ||
          data.prep.status === 'generating'
        ) {
          setStatus('loading');
          if (isActive) {
            pollTimeout = setTimeout(load, 2000);
          }
        } else {
          setStatus('ready');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Network error while loading this 1:1 prep.');
      }
    }

    load();

    // Cleanup function to prevent memory leaks
    return () => {
      isActive = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [id]);

  async function handleDeleteClick(oneOnOneId: string) {
    try {
      const confirmed = window.confirm(
        'Delete this 1:1 prep? This cannot be undone.'
      );
      if (!confirmed) return;

      const res = await fetch(`/api/one-on-ones/${oneOnOneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'archived',
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setStatus('error');
        setErrorMessage(text || 'Failed to delete this 1:1 prep.');
        return;
      }

      router.push('/prep');
    } catch (err) {
      setStatus('error');
      setErrorMessage('Network error while deleting this 1:1 prep.');
    }
  }

  async function handleRegenerateClick(itemId: string) {
    try {
      setStatus('loading');

      const timezone = getTimezone();
      const res = await fetch(`/api/prep/items/${itemId}/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setStatus('error');
        setErrorMessage(text || 'Failed to regenerate this 1:1 prep.');
        return;
      }

      const { data } = await res.json();
      setPrep(data.prep);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setErrorMessage('Network error while regenerating this 1:1 prep.');
    }
  }

  if (status === 'loading' && !prep) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HeaderSkeleton />
        <BodySkeleton />
      </main>
    );
  }

  if (status === 'loading' && !!prep) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 pt-5 z-20 pb-3 bg-background border-b border-white/15">
          <PrepHeader
            prep={prep}
            onRegenerateClick={(id) => handleRegenerateClick(id)}
          />
        </div>
        <BodySkeleton />
      </main>
    );
  }

  if (status === 'not_found') {
    return (
      <ProblemState
        title="This 1:1 prep couldn’t be found"
        body="It may have been deleted, or the link is incorrect. You can create a new 1:1 prep from the prep home."
      />
    );
  }

  if (status === 'error' || !prep) {
    return (
      <ProblemState
        title="We couldn’t load this 1:1 prep"
        body={
          errorMessage ??
          'Something went wrong while fetching this prep. Try refreshing the page or going back to the prep home.'
        }
      />
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 pt-5 z-20 pb-3 bg-background border-b border-white/15">
          <PrepHeader
            prep={prep}
            onDeleteClick={(id) => handleDeleteClick(id)}
            onRegenerateClick={(id) => handleRegenerateClick(id)}
          />
        </div>

        <div className="pb-8 pt-10">
          <PrepBody
            prep={prep}
            onClickInsight={(insight) => {
              setSelectedInsight(insight);
            }}
            onClickMetric={(metric) => {
              setSelectedMetric(metric);
            }}
            onClickActivity={(activity) => {
              setSelectedEvent(activity);
            }}
            onClickCalendarEvent={(event) => {
              setSelectedCalendarEvent(event);
            }}
          />
        </div>
      </main>
      {selectedInsight && (
        <InsightPanel
          key={selectedInsight.id}
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
      {selectedMetric && (
        <MetricPanel
          key={selectedMetric.id}
          metric={selectedMetric}
          onClose={() => setSelectedMetric(null)}
        />
      )}
      {selectedEvent && (
        <EventInspectorPanel
          key={selectedEvent.id}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      {selectedCalendarEvent && (
        <CalendarEventInspectorPanel
          key={selectedCalendarEvent.id}
          event={selectedCalendarEvent}
          onClose={() => setSelectedCalendarEvent(null)}
        />
      )}
    </>
  );
}
