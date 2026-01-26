'use client';

import { CopyableCode } from '@/components/CopyableCode';
import { CliStatus } from '@/types/api/cli';
import {
  CheckCircle2,
  RefreshCw,
  Loader2,
  Check,
  FolderCode,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { Step4 } from './Step4';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = 10 * 60_000; // 10 minutes

export function useCliStatus() {
  const pollStartedAtRef = useRef<number | null>(null);

  const {
    data: res,
    isLoading,
    error,
  } = useSWR<{ data: CliStatus }>('/api/cli/status', fetcher, {
    refreshInterval(res) {
      if (!res) return 0;

      const { onboardingState, cliLinkedAt } = res.data;

      // Start timer on first successful response
      if (pollStartedAtRef.current === null) {
        pollStartedAtRef.current = Date.now();
      }

      const now = Date.now();
      const elapsed = now - pollStartedAtRef.current;

      const isDone = onboardingState === 'synced' && Boolean(cliLinkedAt);

      const timedOut = elapsed > MAX_POLL_DURATION_MS;

      // stop polling if done or timed out
      if (isDone || timedOut) return 0;

      return POLL_INTERVAL_MS;
    },
    revalidateOnFocus: false,
  });

  const status = res?.data;

  return { status, isLoading, error };
}

export function CliSetupPageShell({
  userName,
  isFromSettings,
}: {
  userName?: string | null;
  isFromSettings: boolean;
}) {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  const { status, isLoading, error: _error } = useCliStatus();

  useEffect(() => {
    if (!status) return;
    if (hasRedirectedRef.current) return;

    if (status.onboardingState === 'synced' && status.cliLinkedAt) {
      hasRedirectedRef.current = true;
      sessionStorage.removeItem(STORAGE_KEY);
      const timeout = setTimeout(() => {
        router.push(isFromSettings ? '/settings' : '/onboarding/calendar');
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
  const router = useRouter();
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

  const hasCliToken = !!cliToken;
  const state = status.onboardingState;
  const selectedRepoCount = status.selectedRepos ?? 0;
  const hasSelectedRepos = selectedRepoCount > 0;
  const availableReposCount = status.availableReposCount ?? 0;
  const hasAvailableRepos = availableReposCount > 0;
  const repoSelectionSupported = hasAvailableRepos;

  const step1Expanded =
    (!isFromSettings &&
      (state === 'account_created' || state === 'cli_pending')) ||
    (isFromSettings && !status.cliLinkedAt);
  const step1Completed = hasCliToken || !!status.hasCliToken;

  const step2Enabled = step1Completed;
  const step2Expanded =
    step2Enabled &&
    (isFromSettings ||
      (!isFromSettings &&
        (state === 'cli_pending' || state === 'account_created')));
  const step2Completed = !!status.cliLinkedAt;

  const step3Enabled = step2Completed && repoSelectionSupported;
  const step3Expanded =
    step3Enabled &&
    (isFromSettings || (!isFromSettings && state === 'cli_linked'));

  const step4Enabled = repoSelectionSupported
    ? step3Enabled && hasSelectedRepos
    : state === 'cli_linked' || state === 'syncing' || state === 'synced';
  const isSyncing = state === 'syncing';
  const step4Expanded =
    step4Enabled &&
    (isSyncing ||
      (!isFromSettings && state === 'cli_linked') ||
      (!isFromSettings && state === 'synced'));

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isFromSettings && status.onboardingState === 'synced' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-50">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Your first sync is complete. Redirecting you to your dashboard…
          </span>
        </div>
      )}
      {isFromSettings && status.cliLinkedAt && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-50">
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
          <p className="mt-2 text-md text-text-secondary max-w-xl">
            DevImpact runs as a CLI on{' '}
            <span className="text-text-primary/90">your</span> machine, using
            the official GitHub CLI under your account. You stay in control of
            your code and permissions&mdash;we only see the activity data you
            choose to sync. We use a lookback window of 90 days.
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Step1
            step1Expanded={step1Expanded}
            step1Completed={step1Completed}
            cliToken={cliToken}
            generating={generating}
            handleGenerate={handleGenerate}
          />

          {step2Enabled && (
            <Step2
              step2Enabled={step2Enabled}
              step2Expanded={step2Expanded}
              step3Enabled={step3Enabled}
              cliToken={cliToken}
            />
          )}

          {step3Enabled && (
            <Step3
              step3Enabled={step3Enabled}
              step3Expanded={step3Expanded}
              hasSelectedRepos={hasSelectedRepos}
              selectedRepoCount={selectedRepoCount}
              router={router}
            />
          )}

          {!isFromSettings && step4Enabled && (
            <Step4
              step4Enabled={step4Enabled}
              step4Expanded={step4Expanded}
              isSyncing={isSyncing}
              repoSelectionSupported={repoSelectionSupported}
              hasSelectedRepos={hasSelectedRepos}
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface-alt px-4 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">
              How DevImpact uses your data
            </h3>
            <ul className="space-y-2 text-xs text-text-secondary leading-relaxed">
              <li>
                • We never see your GitHub password or PAT. All API calls go
                through your local <code className="text-xs">gh</code> session.
              </li>
              <li>
                • We read metadata about your PRs, reviews, files, and commits
                to build timelines and stories about your work. We never sync
                code contents.
              </li>
              <li>
                • You can rotate your CLI key or stop syncing at any time.
                Removing <code className="text-xs">gh auth</code> immediately
                cuts off access.
              </li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
