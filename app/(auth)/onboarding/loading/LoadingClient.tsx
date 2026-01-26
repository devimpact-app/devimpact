'use client';

import {
  BootstrapCursor,
  BootstrapCursorSchema,
  BootstrapProgress,
} from '@/lib/domains/jobs/runners.ts/bootstrap/types';
import { JobPublic, JobPublicSchema } from '@/types/api/jobs';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const POLL_MS = 2500;
const KICK_COOLDOWN_MS = 4000;

function jobTerminal(job: JobPublic | null) {
  if (!job) return false;
  return (
    job.status === 'succeeded' ||
    job.status === 'failed' ||
    job.status === 'cancelled'
  );
}

function pct(current?: number, total?: number) {
  if (!total || total <= 0) return null;
  const c = Math.max(0, Math.min(total, current ?? 0));
  return Math.round((c / total) * 100);
}

function titleForStep(step?: BootstrapCursor['step'] | null) {
  switch (step) {
    case 'normalize':
      return 'Organizing GitHub activity';
    case 'derive_events':
      return 'Building your impact log';
    case 'summarize_prs':
      return 'Summarizing pull requests';
    case 'threading':
      return 'Connecting work into threads';
    case 'weekly_summary':
      return 'Generating your first weekly summary';
    case 'done':
      return 'Finishing up';
    default:
      return 'Preparing your dashboard';
  }
}

function iconStateForStep(opts: {
  stepIndex: number;
  activeIndex: number;
  status?: JobPublic['status'];
}) {
  const { stepIndex, activeIndex, status } = opts;

  if (status === 'succeeded') return 'done' as const;
  if (status === 'failed') return 'failed' as const;

  if (stepIndex < activeIndex) return 'done' as const;
  if (stepIndex === activeIndex) return 'active' as const;
  return 'todo' as const;
}

function safeParseCursor(job: JobPublic | null): BootstrapCursor | null {
  const c = job?.cursor ?? null;
  const parsed = BootstrapCursorSchema.safeParse(c);
  return parsed.success ? parsed.data : null;
}

function safeProgress(job: JobPublic | null): BootstrapProgress | null {
  const p = (job?.progress ?? null) as any;
  if (!p || typeof p !== 'object') return null;
  if (typeof p.message !== 'string') return null;
  if (typeof p.step !== 'string') return null;
  return p as BootstrapProgress;
}

function stepOrder(): Array<BootstrapCursor['step']> {
  return [
    'normalize',
    'derive_events',
    'summarize_prs',
    'threading',
    'weekly_summary',
    'done',
  ];
}

function stepIndexFor(step?: BootstrapCursor['step'] | null) {
  const order = stepOrder();
  const idx = step ? order.indexOf(step) : -1;
  return idx >= 0 ? idx : 0;
}

export function LoadingClient({
  initialJob,
}: {
  initialJob: JobPublic | null;
}) {
  const router = useRouter();

  const [job, setJob] = useState<JobPublic | null>(initialJob);
  const [pollError, setPollError] = useState<string | null>(null);
  const [kicking, setKicking] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const lastKickAtRef = useRef<number>(0);
  const kickedOnceRef = useRef<boolean>(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams({
      kind: 'setup_bootstrap_recent',
      dedupeKey: 'bootstrap_recent',
    });
    return p.toString();
  }, []);

  const cursor = useMemo(() => safeParseCursor(job), [job]);
  const progress = useMemo(() => safeProgress(job), [job]);

  const activeStep = progress?.step ?? cursor?.step ?? null;
  const activeStepIdx = stepIndexFor(activeStep);

  const steps = useMemo(() => {
    const order = stepOrder();
    return order.map((s, idx) => {
      const state = iconStateForStep({
        stepIndex: idx,
        activeIndex: activeStepIdx,
        status: job?.status,
      });

      let label = titleForStep(s);
      let sub: string | null = null;

      if (s === 'summarize_prs') {
        const current =
          progress?.current ?? cursor?.summarize?.idx ?? undefined;
        const total =
          progress?.total ?? cursor?.summarize?.items?.length ?? undefined;
        const percent = pct(current, total);
        if (total && total > 0) {
          sub =
            percent != null
              ? `${current ?? 0}/${total} (${percent}%)`
              : `${current ?? 0}/${total}`;
        }
      }

      return { step: s, label, state, sub };
    });
  }, [activeStepIdx, job?.status, progress, cursor]);

  const headline = useMemo(() => {
    if (job?.status === 'failed') return 'Setup hit a snag';
    if (job?.status === 'succeeded') return 'You’re all set';
    return titleForStep(activeStep);
  }, [job?.status, activeStep]);

  const message = useMemo(() => {
    if (job?.status === 'failed') {
      return (
        job?.lastError ??
        'Something went wrong while preparing your dashboard. You can retry the setup.'
      );
    }
    if (job?.status === 'succeeded') {
      return 'Your dashboard is ready.';
    }
    return (
      progress?.message ??
      'DevImpact is preparing your dashboard. This could take a minute or two.'
    );
  }, [job?.status, job?.lastError, progress?.message]);

  async function fetchStatus(): Promise<JobPublic | null> {
    const res = await fetch(`/api/jobs/status?${qs}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Status failed: ${res.status}`);
    const body = await res.json();
    const candidate = body?.data?.job ?? null;
    if (!candidate) return null;
    return JobPublicSchema.parse(candidate);
  }

  async function kickBootstrapBestEffort(reason: string) {
    const now = Date.now();
    if (now - lastKickAtRef.current < KICK_COOLDOWN_MS) return;

    lastKickAtRef.current = now;
    setKicking(true);
    try {
      const res = await fetch('/api/jobs/kick-bootstrap', { method: 'POST' });
      if (!res.ok) {
        console.warn('[LOADING] kick failed', { status: res.status, reason });
      }
    } catch (e) {
      console.warn('[LOADING] kick threw', { e, reason });
    } finally {
      setKicking(false);
    }
  }

  async function enqueueBootstrapBestEffort() {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'setup_bootstrap_recent',
        dedupeKey: 'bootstrap_recent',
        priority: 10,
        nextRunAt: new Date().toISOString(),
        payload: { lookbackDays: 14 },
      }),
    });

    if (!res.ok && res.status !== 409) {
      throw new Error(`Enqueue failed: ${res.status}`);
    }
  }

  async function retrySetup() {
    setRetrying(true);
    setPollError(null);

    try {
      await enqueueBootstrapBestEffort();
      kickedOnceRef.current = false;
      await kickBootstrapBestEffort('manual_retry');
      const fresh = await fetchStatus();
      setJob(fresh);
    } catch (e) {
      console.error('[LOADING] retry setup failed', e);
      setPollError('Could not restart setup. Please try again.');
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    if (job?.status === 'succeeded') {
      router.replace('/onboarding/complete');
    }
  }, [job?.status, router]);

  useEffect(() => {
    if (!job) return;
    if (job.status !== 'queued') return;
    if (kickedOnceRef.current) return;

    kickedOnceRef.current = true;
    kickBootstrapBestEffort('initial_queued');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jobRef = useRef<JobPublic | null>(job);
  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (jobTerminal(jobRef.current)) return;

      try {
        const fresh = await fetchStatus();
        if (!fresh) {
          await enqueueBootstrapBestEffort();
          await kickBootstrapBestEffort('poll_found_no_job');
          // Let next poll observe it
          return;
        }
        if (cancelled) return;

        setJob(fresh);
        setPollError(null);

        // If still queued, we can kick occasionally to reduce "stuck waiting for cron"
        if (fresh?.status === 'queued') {
          kickBootstrapBestEffort('still_queued');
        }

        if (fresh?.status === 'succeeded') {
          router.replace('/onboarding/complete');
          return;
        }

        // TODO: show error UI + a "Retry setup" button (enqueue + kick)
      } catch (e: any) {
        if (cancelled) return;
        console.warn('[LOADING] poll failed', e);
        setPollError('Couldn’t refresh setup status. Retrying…');
      }
    };

    tick();
    const id = window.setInterval(tick, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [qs, router]);

  // Handle no job yet
  useEffect(() => {
    if (job) return;
    if (kickedOnceRef.current) return;

    (async () => {
      try {
        await enqueueBootstrapBestEffort();
        kickedOnceRef.current = true;
        await kickBootstrapBestEffort('no_job_on_load');
        const fresh = await fetchStatus();
        setJob(fresh);
      } catch (e) {
        console.error('[LOADING] no-job bootstrap init failed', e);
        setPollError('Could not start setup. Please refresh.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  const showSpinner = job?.status !== 'failed' && job?.status !== 'succeeded';

  return (
    <main className="min-h-screen bg-background px-6 pt-28">
      <div className="w-full max-w-md text-center mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div
            className={
              job?.status === 'failed'
                ? 'flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10'
                : 'flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10'
            }
          >
            {job?.status === 'failed' ? (
              <AlertTriangle className="h-6 w-6 text-red-300" />
            ) : showSpinner ? (
              <Loader2 className="h-6 w-6 text-indigo-200 animate-spin" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            )}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">{headline}</h1>

          <p className="text-sm text-text-secondary">{message}</p>

          <div className="w-full flex flex-col mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 items-stretch text-left">
            <p className="text-xs font-medium text-text-primary mb-3 text-center">
              Setup progress
            </p>

            <ul className="space-y-2">
              {steps.map((s) => (
                <li key={s.step} className="flex items-start gap-2">
                  <span
                    className={
                      s.state === 'done'
                        ? 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30'
                        : s.state === 'active'
                          ? 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/30'
                          : s.state === 'failed'
                            ? 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30'
                            : 'mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/[0.02] border border-white/10'
                    }
                  >
                    {s.state === 'done' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    ) : s.state === 'failed' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    ) : s.state === 'active' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    )}
                  </span>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-text-secondary">
                        {s.label}
                      </span>
                      {s.sub ? (
                        <span className="text-xs text-white/40 font-mono">
                          {s.sub}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-white/40">
                {pollError ? (
                  <span className="text-red-300">{pollError}</span>
                ) : job?.status === 'queued' ? (
                  'Queued — starting shortly…'
                ) : job?.status === 'running' ? (
                  'Running…'
                ) : job?.status === 'failed' ? (
                  'Failed'
                ) : job?.status === 'succeeded' ? (
                  'Done'
                ) : (
                  '…'
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-text-secondary">
            You can leave this page — setup will continue in the background.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {job?.status === 'failed' ? (
            <>
              <button
                type="button"
                onClick={retrySetup}
                disabled={retrying}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-500/50 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-400/50 transition disabled:opacity-60"
              >
                {retrying ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrying…
                  </span>
                ) : (
                  'Retry setup'
                )}
              </button>

              <Link
                href="/settings"
                className="inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-medium text-white/50 shadow-sm hover:bg-slate-900 transition border border-white/10"
              >
                View settings
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
