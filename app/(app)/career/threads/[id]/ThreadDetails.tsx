'use client';

import Link from 'next/link';
import { ArrowLeft, Calendar, Activity, Pencil } from 'lucide-react';
import type { GetThreadDetailResponse } from '@/types/api/threads';
import { categoryLabel, categoryPillClasses } from '../shared';

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function pct(conf?: number | null) {
  if (conf == null) return null;
  const v = Math.round(conf * 100);
  return `${v}%`;
}

export function ThreadDetailPage({
  data,
  backHref = '/career/threads',
  isLoading = false,
  error = null,
}: {
  data?: GetThreadDetailResponse;
  backHref?: string;
  isLoading?: boolean;
  error?: string | null;
}) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="animate-pulse space-y-4">
            {/* Back + category */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10" />
              <div className="h-6 w-24 rounded-full bg-white/10" />
            </div>

            {/* Title */}
            <div className="h-7 w-2/3 rounded-md bg-white/10" />

            {/* Meta row */}
            <div className="flex gap-4">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-4 w-40 rounded bg-white/10" />
            </div>

            {/* Summary box */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="h-4 w-24 rounded bg-white/10" />
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
              Failed to load thread
            </div>
            <div className="mt-1 text-sm text-rose-200/70">{error}</div>

            <div className="mt-4">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to threads
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const t = data.thread;
  const first = fmtDate(t.firstActivityAt);
  const last = fmtDate(t.lastActivityAt);
  const range =
    first && last ? `${first} → ${last}` : first ? `Since ${first}` : null;

  const confidence = pct(t.confidence);

  return (
    <div className="min-h-screen text-white">
      <div className="border-b border-white/10 bg-gradient-to-b from-blue-950/30 via-blue-950/25 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="mb-4">
            <Link
              href={backHref}
              className="inline-flex px-2 py-1 items-center justify-center text-white/80 transition hover:underline text-xs"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to All Threads
            </Link>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      categoryPillClasses(t.categoryKey),
                    ].join(' ')}
                  >
                    {categoryLabel(t.categoryKey)}
                  </span>

                  {t.status === 'archived' ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70">
                      Archived
                    </span>
                  ) : null}

                  {confidence ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70">
                      Confidence {confidence}
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {t.title}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/60">
                  {range ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {range}
                    </span>
                  ) : null}

                  <span className="inline-flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" />
                    {t.eventCountTotal} events
                    {t.eventCountsByKind ? (
                      <span className="text-white/45">
                        · PR {t.eventCountsByKind.pr} · Reviews{' '}
                        {t.eventCountsByKind.review} · Meetings{' '}
                        {t.eventCountsByKind.meeting}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>

            {/* Right actions (TODO: wire up) */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                // TODO: open edit flow
                onClick={() => {}}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/30 p-4 backdrop-blur">
            <div className="text-[12px] font-medium text-white/80">Summary</div>
            <div className="mt-2 text-[13px] leading-relaxed text-white/70">
              {t.summary?.trim() ? (
                <p>{t.summary}</p>
              ) : (
                <p className="text-white/45">No summary yet.</p>
              )}
            </div>

            {t.lastUpdate ? (
              <div className="mt-4 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-medium text-white/80">
                    Last update
                  </div>
                  <div className="text-[11px] text-white/45">
                    {fmtDateTime(t.lastUpdate.generatedAt) ?? ''}
                  </div>
                </div>

                {t.lastUpdate.headline ? (
                  <div className="mt-2 text-[13px] text-white/70">
                    {t.lastUpdate.headline}
                  </div>
                ) : null}

                {t.lastUpdate.bullets?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-white/65">
                    {t.lastUpdate.bullets.slice(0, 6).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5">
          <div className="text-[13px] font-medium text-white/85">Events</div>
          <div className="mt-1 text-[12px] text-white/55">
            TODO: event list + inspector integration.
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[12px] font-medium text-white/80">
                Last event
              </div>
              <div className="mt-2 text-[12px] text-white/60">
                {t.lastEvent ? (
                  <div className="space-y-1">
                    <div className="text-white/75">{t.lastEvent.title}</div>
                    <div className="text-white/45">
                      {fmtDateTime(t.lastEvent.occurredAt) ?? ''}
                      {t.lastEvent.repoFullName && t.lastEvent.prNumber
                        ? ` · ${t.lastEvent.repoFullName} #${t.lastEvent.prNumber}`
                        : t.lastEvent.repoFullName
                          ? ` · ${t.lastEvent.repoFullName}`
                          : ''}
                    </div>
                  </div>
                ) : (
                  <span className="text-white/45">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
