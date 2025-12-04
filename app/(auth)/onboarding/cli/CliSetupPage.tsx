'use client';

import { CopyableCode } from '@/components/CopyableCode';
import { CliStatus } from '@/types/api/cli';
import {
  Terminal,
  KeyRound,
  CheckCircle2,
  Copy,
  RefreshCw,
  Loader2,
  Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CliSetupPageShell({
  userName,
  isFromSettings,
}: {
  userName?: string | null;
  isFromSettings: boolean;
}) {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  const { data: res, isLoading } = useSWR<{ data: CliStatus }>(
    '/api/cli/status',
    fetcher,
    {
      // don't start polling until we have data
      refreshInterval(res) {
        if (!res) return 0;
        const stopPolling =
          res.data.onboardingState === 'synced' && res.data.cliLinkedAt;
        return stopPolling ? 0 : 5_000;
      },
    }
  );
  const status = res?.data;

  useEffect(() => {
    if (!status) return;
    if (hasRedirectedRef.current) return;

    if (status.onboardingState === 'synced' && status.cliLinkedAt) {
      hasRedirectedRef.current = true;
      sessionStorage.removeItem(STORAGE_KEY);
      const timeout = setTimeout(() => {
        router.push(isFromSettings ? '/settings' : '/dashboard');
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [status?.onboardingState, status?.cliLinkedAt, isFromSettings, router]);

  if (isLoading || !status) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0E111A] p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-60 rounded bg-white/5 animate-pulse" />
        </div>

        <div className="h-px w-full bg-white/5" />

        <div className="space-y-4">
          <div className="h-14 rounded-xl border border-white/10 bg-[#11151F] animate-pulse" />
          <div className="h-14 rounded-xl border border-white/10 bg-[#11151F] animate-pulse" />
          <div className="h-14 rounded-xl border border-white/10 bg-[#11151F] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <CliSetupPage
      status={status}
      userName={userName}
      isFromSettings={isFromSettings}
    />
  );
}

type CliSetupPageProps = {
  userName?: string | null;
  status: CliStatus;
  isFromSettings: boolean;
};

const STORAGE_KEY = 'devimpact_cli_token';

export function CliSetupPage({
  userName,
  status,
  isFromSettings,
}: CliSetupPageProps) {
  const [cliToken, setCliToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const firstName = userName ? userName.split(' ')[0] : 'there';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCliToken(stored);
    }
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/cli/token', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate CLI token');
      const data = await res.json();
      setCliToken(data.cliToken);
      // Save in browser memory so lasts across refresh
      sessionStorage.setItem(STORAGE_KEY, data.cliToken);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!cliToken) return;
    try {
      await navigator.clipboard.writeText(cliToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const hasCliToken = !!cliToken || status.hasCliToken;
  const state = status.onboardingState;

  const step1Expanded =
    (!isFromSettings &&
      (state === 'account_created' || state === 'cli_pending')) ||
    (isFromSettings && !status.cliLinkedAt);
  const step1Completed = hasCliToken;

  const step2Enabled = step1Completed;
  const step2Expanded =
    step2Enabled &&
    (isFromSettings || (!isFromSettings && state === 'cli_pending'));

  const step3Enabled = state === 'cli_linked' || state === 'syncing';
  const step3Expanded = state === 'cli_linked' || state === 'syncing';
  const isSyncing = state === 'syncing';

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isFromSettings && status.onboardingState === 'synced' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-50">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Your first sync is complete. Redirecting you to your dashboard…
          </span>
        </div>
      )}
      {isFromSettings && status.cliLinkedAt && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-50">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Your CLI was reconnected. Redirecting you back to settings...
          </span>
        </div>
      )}

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
            Welcome, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-text-secondary max-w-xl">
            DevImpact runs as a CLI on{' '}
            <span className="text-text-primary/90">your</span> machine, using
            the official GitHub CLI under your account. You stay in control of
            your code and permissions&mdash;we only see the activity data you
            choose to sync.
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)]">
        <div className="space-y-4">
          <section
            className={`
      rounded-2xl border px-5 py-4 flex flex-col gap-3
      bg-surface-alt border-border
      ${!step1Expanded ? 'opacity-80' : ''}
    `}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#151928] border border-white/10">
                  <KeyRound className="h-4 w-4 text-white/80" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary tracking-tight">
                    Step 1 · Generate your CLI key
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    This key links your local CLI to your DevImpact account.
                    It’s not a GitHub token and doesn’t grant access by itself.
                  </p>
                </div>
              </div>

              {step1Completed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-200">
                  <Check className="h-3 w-3" />
                  Ready
                </span>
              )}
            </div>

            {step1Expanded && (
              <div className="mt-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-3">
                {cliToken ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-text-secondary uppercase tracking-wide">
                      Your personal CLI key
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-lg bg-[#050814] border border-white/10 px-3 py-1.5 text-[11px] text-[#E5EDFF]">
                        {cliToken}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#111520] px-2.5 py-1.5 text-[11px] text-white/80 hover:bg-[#171C2B]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary mt-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {generating ? 'Rotating key…' : 'Rotate key'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-text-secondary">
                      Click below to create a one-time CLI key for this account.
                      You can rotate or revoke it later.
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="inline-flex items-center gap-2 rounded-full border border-indigo-500/70 bg-indigo-600/20 px-3 py-1.5 text-[11px] font-medium text-indigo-100 hover:bg-indigo-600/30 disabled:opacity-60"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3.5 w-3.5" />
                          Generate CLI key
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section
            className={`
      rounded-2xl border px-5 py-4 flex flex-col gap-3
      bg-surface-alt border-border
      ${!step2Enabled ? 'opacity-40 pointer-events-none' : ''}
    `}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#151928] border border-white/10">
                  <Terminal className="h-4 w-4 text-white/80" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary tracking-tight">
                    Step 2 · Install GitHub CLI & DevImpact CLI
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    DevImpact piggybacks on your existing GitHub auth. We never
                    see your PAT or password — we only talk to{' '}
                    <code className="text-[10px]">gh api</code>.
                  </p>
                </div>
              </div>

              {step2Enabled && !step3Enabled && (
                <span className="text-[10px] text-text-secondary uppercase tracking-wide">
                  Next
                </span>
              )}
              {step3Enabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-200">
                  <Check className="h-3 w-3" />
                  Installed
                </span>
              )}
            </div>

            {step2Expanded && cliToken && (
              <div className="mt-1 space-y-3 text-[11px] text-text-secondary">
                <div>
                  <p className="mb-1 font-medium text-text-primary/90">
                    1. Install GitHub CLI
                  </p>
                  <CopyableCode>brew install gh</CopyableCode>
                  <CopyableCode>gh auth login</CopyableCode>
                </div>

                <div>
                  <p className="mb-1 font-medium text-text-primary/90">
                    2. Install DevImpact CLI
                  </p>
                  <CopyableCode>npm install -g @devimpact/cli</CopyableCode>
                </div>

                <div>
                  <p className="mb-1 font-medium text-text-primary/90">
                    3. Link the CLI to your account
                  </p>
                  <CopyableCode>
                    {`devimpact init --cli-token ${cliToken}`}
                  </CopyableCode>
                </div>
              </div>
            )}
          </section>

          {!isFromSettings && (
            <section
              className={`
    rounded-2xl border px-5 py-4 flex flex-col gap-3
    ${isSyncing ? 'border-[#4F46E5] bg-[#111728] animate-pulse' : 'bg-surface-alt border-border'}
    ${!step3Enabled ? 'opacity-40 pointer-events-none' : ''}
  `}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary tracking-tight">
                    Step 3 · Pull in your recent work
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Run a basic sync from a repo you work in. You&apos;ll see
                    your dashboard update once activity comes in.
                  </p>
                  {isSyncing && (
                    <p className="mt-1 text-[10px] text-text-secondary">
                      A basic sync usually takes{' '}
                      <span className="font-medium">20–60 seconds</span>,
                      depending on repo size.
                    </p>
                  )}
                </div>

                {isSyncing ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1E293B] border border-[#4F46E5] px-2 py-0.5 text-[10px] text-[#E0E7FF]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing…
                  </span>
                ) : (
                  step3Enabled && (
                    <span className="text-[10px] text-text-secondary uppercase tracking-wide">
                      Ready to sync
                    </span>
                  )
                )}
              </div>

              {step3Expanded && (
                <div className="mt-2 space-y-3 text-[11px] text-text-secondary">
                  {isSyncing ? (
                    <>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-white/30" />
                          <span>Fetching authored PRs and code reviews…</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-white/30" />
                          <span>Processing commits and file metadata</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-white/30" />
                          <span>Organizing activity into your timeline…</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-text-secondary leading-snug">
                        We only read PRs, reviews, and commits for the repo you
                        choose via <code className="text-[10px]">gh api</code>.
                        You can see every call in your terminal and stop syncing
                        at any time.
                      </p>

                      <p className="text-[11px] text-text-secondary leading-snug">
                        Once this finishes, your dashboard will unlock with your{' '}
                        <span className="font-medium">weekly pulse</span>,{' '}
                        <span className="font-medium">work rhythm heatmap</span>
                        , and <span className="font-medium">1:1 prep view</span>
                        .
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-text-primary/90">
                        From a repo directory:
                      </p>
                      <pre className="rounded-lg bg-[#050814] border border-white/10 px-3 py-2 text-[11px] text-[#D0E1FF] overflow-x-auto">
                        <code>devimpact sync --repo my-org/my-service</code>
                      </pre>
                      <p className="text-[11px] text-text-secondary leading-snug">
                        DevImpact will use{' '}
                        <code className="text-[10px]">gh api</code> to read your
                        PRs, reviews, and commits and attach them to your
                        account. You stay in control of your GitHub auth and can
                        revoke access at any time.
                      </p>
                      <p className="text-[11px] text-text-secondary leading-snug">
                        After your first sync, head to the Dashboard to see your
                        activity timeline, highlights, and work rhythm.
                      </p>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface-alt px-4 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">
              How DevImpact uses your data
            </h3>
            <ul className="space-y-2 text-[11px] text-text-secondary leading-relaxed">
              <li>
                • We never see your GitHub password or PAT. All API calls go
                through your local <code className="text-[10px]">gh</code>{' '}
                session.
              </li>
              <li>
                • We read metadata about your PRs, reviews, files, and commits
                to build timelines and stories about your work. We never sync
                code contents.
              </li>
              <li>
                • You can rotate your CLI key or stop syncing at any time.
                Removing <code className="text-[10px]">gh auth</code>{' '}
                immediately cuts off access.
              </li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
