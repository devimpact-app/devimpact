'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { CounterpartType } from '@/types/api/one-on-one';
import { getTimezone } from '@/lib/utils/date';

function getDefaultMeetingDateTime() {
  const now = new Date();

  const minutes = now.getMinutes();
  const rounded = minutes <= 30 ? 30 : 60; // if after :30, round to top of next hour

  const next = new Date(now);
  next.setMinutes(rounded, 0, 0);

  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  const hh = String(next.getHours()).padStart(2, '0');
  const min = String(next.getMinutes()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  };
}

export function OneOnOnePrepClient({
  initialTitle,
  shortWindowStart,
}: {
  initialTitle?: string;
  shortWindowStart?: string;
}) {
  const router = useRouter();

  const [counterpartLabel, setCounterpartLabel] = useState('');
  const [counterpartType, setCounterpartType] =
    useState<CounterpartType>('manager');

  const { date: defaultDate, time: defaultTime } = getDefaultMeetingDateTime();

  const [meetingDate, setMeetingDate] = useState(defaultDate);
  const [meetingTime, setMeetingTime] = useState(defaultTime);

  const [windowWeeks, setWindowWeeks] = useState<1 | 2 | 4 | null>(
    shortWindowStart ? null : 2
  );
  const [title, setTitle] = useState(initialTitle ?? '');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);

    try {
      const timezone = getTimezone();
      const meetingAt =
        meetingDate && meetingTime
          ? new Date(`${meetingDate}T${meetingTime}:00`)
          : meetingDate
            ? new Date(`${meetingDate}T12:00:00`)
            : null;

      const payload = {
        counterpartLabel: counterpartLabel.trim() || undefined,
        counterpartType,
        meetingAt: meetingAt?.toISOString() ?? null,
        windowWeeks: windowWeeks ?? undefined,
        title: title.trim() || undefined,
        timezone,
        shortWindowStart: shortWindowStart ?? undefined,
      };

      const res = await fetch('/api/one-on-ones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Failed to generate 1:1 prep`);
      }

      const json = await res.json();
      const oneOnOne = json.data?.prep ?? json;

      if (!oneOnOne?.id) {
        throw new Error('Missing 1:1 id in response');
      }

      router.push(`/prep/one-on-one/${oneOnOne.id}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Something went wrong while generating prep.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
      <button
        onClick={() => router.push('/prep')}
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        ← Back
      </button>

      {/* Hero */}
      <header className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
              Prepare for your next 1:1
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Pull together wins, bottlenecks, and talking points from your
              recent work so you walk in ready with clarity and momentum.
            </p>
          </div>
        </div>
      </header>

      {/* Quick start card */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-sm shadow-black/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-slate-100">
            Quick start 1:1 prep
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Generate a 1:1 packet using your recent work. We&apos;ll default to
            about the last 2 weeks and pull in longer-term patterns when
            they&apos;re relevant. You can always tweak the details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center rounded-full border border-sky-500/80 bg-sky-500/90 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-sm shadow-sky-900/50 hover:bg-sky-400 transition-colors"
          >
            {isGenerating ? 'Generating…' : 'Generate 1:1 prep'}
          </button>
        </div>
      </section>

      {/* Advanced options toggle */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 shadow-sm shadow-black/30">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-slate-100">
              Advanced options
            </h2>
            <p className="text-xs text-slate-400">
              Add context about who this 1:1 is with, timing, and how far back
              we should look.
            </p>
          </div>
          <span
            className="
              inline-flex h-7 w-7 items-center justify-center 
              rounded-full border border-slate-700/80 bg-slate-900/80
              text-slate-300
            "
          >
            {showAdvanced ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        </button>

        {showAdvanced && (
          <div className="border-t border-slate-800/80 px-5 py-4 space-y-6">
            {/* Basic info */}
            <div>
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-slate-300">
                  Basic info
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Who this 1:1 is with and how you work together.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_auto] gap-4 items-center">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Counterpart
                  </label>
                  <input
                    type="text"
                    value={counterpartLabel}
                    onChange={(e) => setCounterpartLabel(e.target.value)}
                    placeholder="e.g. Alice"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/70 focus:border-sky-500/70"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Relationship
                  </label>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/60 px-1.5 py-1 border border-slate-800/70">
                    {(
                      [
                        { value: 'manager', label: 'Manager' },
                        { value: 'direct_report', label: 'Direct report' },
                        { value: 'peer', label: 'Peer' },
                        { value: 'other', label: 'Other' },
                      ] as const
                    ).map((opt) => {
                      const active = counterpartType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCounterpartType(opt.value)}
                          className={[
                            'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                            active
                              ? 'bg-sky-500/90 text-slate-50 shadow-sm shadow-sky-900/60'
                              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-50',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-1">
                This stays private inside DevImpact — nothing is shared
                externally.
              </p>
            </div>

            {/* Timing & focus */}
            <div>
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-slate-300">
                  Timing & focus
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  When the 1:1 is happening and how far back we should look when
                  pulling in work and patterns.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* When is this 1:1? */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    When is this 1:1?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/70 focus:border-sky-500/70"
                    />
                    <input
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/70 focus:border-sky-500/70"
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Optional. If you leave this blank, we&apos;ll assume your
                    next upcoming 1:1.
                  </p>
                </div>

                {/* Focus window */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    What period should we focus on?
                  </label>
                  <div className="inline-flex flex-wrap gap-1.5 rounded-full bg-slate-950/60 px-1.5 py-1 border border-slate-800/70">
                    {[
                      { value: 1 as const, label: 'Last week' },
                      { value: 2 as const, label: 'Last 2 weeks' },
                      { value: 4 as const, label: 'Last 4 weeks' },
                    ].map((opt) => {
                      const active = windowWeeks === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setWindowWeeks(opt.value)}
                          className={[
                            'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                            active
                              ? 'bg-sky-500/90 text-slate-50 shadow-sm shadow-sky-900/60'
                              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-50',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    We&apos;ll still pull in longer-term trends when
                    they&apos;re relevant.
                  </p>
                </div>

                {/* Optional title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`1:1 with ${
                      counterpartLabel || 'your manager'
                    } – Week of …`}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/70 focus:border-sky-500/70"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Helpful if you want to come back to this later. Otherwise,
                    we&apos;ll name it for you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <p className="text-[11px] text-red-300">
          There was an error generating your 1:1. Please try again later.
        </p>
      )}

      {/* Footer note */}
      <div className="pt-1">
        <p className="text-[11px] text-slate-500">
          DevImpact never messages your manager or calendar directly. This prep
          is just for you.
        </p>
      </div>
    </main>
  );
}
