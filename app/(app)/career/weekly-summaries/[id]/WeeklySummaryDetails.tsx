'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  FilePlus,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  GetWeeklySummaryDetailResponse,
  WeeklySummaryItem,
} from '@/types/api/weekly-summary';
import { getStartAndEndDateForWeeklySummary } from '../../components/WeeklySummariesSection/helpers';
import { formatDateOnly, getTimezone } from '@/lib/utils/date';
import { ActivityEventsSection } from '../../threads/[id]/ActivityEventsSection';
import { ActivityEventInspectorPanel } from '../../threads/[id]/ActivityEventInspectorPanel';
import { BasedOnThreads } from './BasedOnThreads';
import { WeeklyActivitySection } from './WeeklyActivitySection';
import { ActivityEvent } from '@/types/api/timeline';
import { EventInspectorPanel } from '@/app/(app)/timeline/components/EventInspectorPanel';
import { useRouter } from 'next/navigation';

function statusPill(status: WeeklySummaryItem['status']) {
  switch (status) {
    case 'ready':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
    case 'generating':
      return 'border-indigo-400/20 bg-indigo-400/10 text-indigo-200';
    case 'pending':
      return 'border-white/10 bg-white/[0.03] text-white/70';
    case 'failed':
      return 'border-rose-400/20 bg-rose-400/10 text-rose-200';
    case 'skipped':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
    default:
      return 'border-white/10 bg-white/[0.03] text-white/70';
  }
}

export function WeeklySummaryDetailPage({
  data,
  backHref = '/career/weekly-summaries',
  isLoading = false,
  error = null,
  onRegenerate,
  generateLoading = false,
}: {
  data?: GetWeeklySummaryDetailResponse;
  backHref?: string;
  isLoading?: boolean;
  error?: string | null;
  onRegenerate: () => void;
  generateLoading?: boolean;
}) {
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedActivityEvent, setSelectedActivityEvent] =
    useState<ActivityEvent | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  const summary = data?.summary;
  const weekEndLocalDate = useMemo(() => {
    if (!summary?.weekStartLocalDate) return null;
    const { endDate } = getStartAndEndDateForWeeklySummary(
      summary.weekStartLocalDate
    );
    return endDate.toISOString().slice(0, 10);
  }, [summary?.weekStartLocalDate]);

  const rangeLabel = useMemo(() => {
    if (!summary?.weekStartLocalDate) return null;
    const start = formatDateOnly(`${summary.weekStartLocalDate}T00:00:00`);
    return `Summary - Week of ${start}`;
  }, [summary?.weekStartLocalDate, weekEndLocalDate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-36 rounded-full bg-white/10" />
              <div className="h-6 w-24 rounded-full bg-white/10" />
            </div>

            <div className="h-8 w-2/3 rounded-md bg-white/10" />

            <div className="flex gap-4">
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="h-4 w-48 rounded bg-white/10" />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full rounded bg-white/10" />
                <div className="h-4 w-5/6 rounded bg-white/10" />
                <div className="h-4 w-4/6 rounded bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5">
            <div className="text-sm font-medium text-rose-200">
              Failed to load weekly summary
            </div>
            <div className="mt-1 text-sm text-rose-200/70">{error}</div>

            <div className="mt-4">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to summaries
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const out = summary.output;
  const headline = out?.headline?.trim() ?? '';
  const bullets = out?.bullets ?? [];

  const generatedAt = formatDateOnly(summary.generatedAt ?? null);

  return (
    <>
      <div className="min-h-screen text-white">
        <div className="border-b border-white/10 bg-gradient-to-b from-blue-950/30 via-blue-950/25 to-transparent">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
            <div className="mb-4">
              <Link
                href={backHref}
                className="inline-flex px-2 py-1 items-center justify-center text-white/80 transition hover:underline text-xs"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Weekly Summaries
              </Link>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      statusPill(summary.status),
                    ].join(' ')}
                  >
                    {summary.status === 'ready'
                      ? 'Ready'
                      : summary.status === 'generating'
                        ? 'Generating'
                        : summary.status === 'pending'
                          ? 'Pending'
                          : summary.status === 'failed'
                            ? 'Failed'
                            : 'Skipped'}
                  </span>

                  {summary.status === 'failed' && summary.lastError ? (
                    <span className="inline-flex items-center rounded-full border border-rose-400/20 bg-rose-400/5 px-2.5 py-1 text-[11px] font-medium text-rose-200">
                      Error
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {rangeLabel ?? 'Weekly Summary'}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {summary.weekStartLocalDate}{' '}
                    {weekEndLocalDate ? `→ ${weekEndLocalDate}` : ''}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <FilePlus className="h-3.5 w-3.5" />
                    {generatedAt ? `Created ${generatedAt}` : 'Not created yet'}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="flex items-center justify-center h-9 w-9 rounded-full border border-white/15
                 bg-surface-lower text-text-secondary hover:text-text-primary transition"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>

                  <div
                    className="pointer-events-none absolute right-0 top-full mt-1
                 opacity-0 group-hover:opacity-100 transition
                 whitespace-nowrap rounded-md bg-surface-elevated px-2 py-1 text-xs text-text-primary
                 shadow-lg"
                  >
                    Regenerate
                  </div>
                </div>

                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {}}
                    className="flex items-center justify-center h-9 w-9 rounded-full
                 bg-red-400/20 text-red-300 hover:bg-red-400/30 transition
                 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div
                    className="pointer-events-none absolute right-0 top-full mt-1
                 opacity-0 group-hover:opacity-100 transition
                 whitespace-nowrap rounded-md px-2 py-1 text-xs text-text-primary
                 shadow-lg"
                  >
                    Delete
                  </div>
                </div>
              </div>
            </div>

            <div
              className="
                mt-5 rounded-2xl
                border border-white/10
                bg-slate-900/30 p-4 backdrop-blur
                shadow-[0_12px_30px_rgba(0,0,0,0.35)]
              "
            >
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-1 bg-indigo-600/70 rounded-full" />
                    <div className="text-[13px] font-semibold text-white/95">
                      Weekly Summary
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[13px] leading-relaxed text-white/70">
                  {generateLoading ? (
                    <div className="mt-2 space-y-2">
                      <div className="h-4 w-[70%] rounded bg-white/10 animate-pulse" />
                      <div className="h-4 w-[55%] rounded bg-white/10 animate-pulse" />
                    </div>
                  ) : (
                    <>
                      {headline ? (
                        <p className="text-[14px] font-medium text-white/70">
                          {headline}
                        </p>
                      ) : summary.status === 'ready' ? (
                        <p className="text-white/45">No headline generated.</p>
                      ) : summary.status === 'failed' ? (
                        <p className="text-rose-200/80">
                          Failed to generate. {summary.lastError ?? ''}
                        </p>
                      ) : summary.status === 'skipped' ? (
                        <p className="text-amber-200/80">
                          Skipped. {summary.lastError ?? ''}
                        </p>
                      ) : (
                        <p className="text-white/45">
                          Not created yet. Generate to see a summary.
                        </p>
                      )}
                    </>
                  )}

                  {generateLoading ? (
                    <ul className="mt-3 space-y-2 pl-5">
                      {[0, 1, 2].map((i) => (
                        <li
                          key={i}
                          className="h-3 w-[80%] rounded bg-white/10 animate-pulse"
                        />
                      ))}
                    </ul>
                  ) : bullets.length > 0 ? (
                    <ul className="mt-3 space-y-2 pl-5 list-disc">
                      {bullets.map((b, idx) => (
                        <li
                          key={`${idx}-${b.text.slice(0, 16)}`}
                          className="text-[13px] leading-relaxed text-white/70"
                        >
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
              <WeeklyActivitySection
                activity={data.summary.activity}
                onEventClick={(event) => {
                  setSelectedActivityEvent(event);
                  setSelectedEventId(null);
                }}
              />
              <BasedOnThreads threads={data.threads} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <ActivityEventsSection
            events={data.events}
            onSelect={(id) => {
              setSelectedActivityEvent(null);
              setSelectedEventId(id);
            }}
            title="Evidence from this week"
            subtitle="Activity that informed this summary"
          />
        </div>
      </div>
      {selectedEventId && (
        <ActivityEventInspectorPanel
          activityEventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
        />
      )}
      {selectedActivityEvent && (
        <EventInspectorPanel
          event={selectedActivityEvent}
          onClose={() => setSelectedActivityEvent(null)}
        />
      )}
    </>
  );
}
