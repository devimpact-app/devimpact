'use client';

import { Github, TerminalSquare, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CopyableCode } from '@/components/CopyableCode';

type GithubCliCardProps = {
  cliDisconnected: boolean;
  resetLoading: boolean;
  cliText: string;
  selectedReposCount: number;
  availableReposCount: number;
  handleCliClick: () => void;
};

export function GithubCliCard({
  cliDisconnected,
  resetLoading,
  cliText,
  selectedReposCount,
  availableReposCount,
  handleCliClick,
}: GithubCliCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const hasSelectedRepos = selectedReposCount > 0;
  const hasAvailableRepos = availableReposCount > 0;

  function handleManageRepos() {
    router.push('/onboarding/repos?fromSettings=true');
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3.5">
      {/* Header row (non-collapsible) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-3">
          <div className="mt-0.5 flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
            <Github className="h-4 w-4 text-slate-100" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-100">GitHub via CLI</p>
            <p className="text-xs text-slate-400">
              DevImpact syncs your PRs, reviews, and activity from GitHub using
              the{' '}
              <code className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200">
                devimpact
              </code>{' '}
              CLI on your machine.
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-2">
          {!cliDisconnected && (
            <button
              type="button"
              onClick={handleManageRepos}
              className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
            >
              Manage repos
            </button>
          )}
          <button
            type="button"
            onClick={handleCliClick}
            disabled={resetLoading}
            className="rounded-full border border-sky-500/70 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cliText}
          </button>
        </div>
      </div>

      {/* Status + collapse toggle row */}
      {!cliDisconnected && (
        <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center flex-wrap gap-1.5">
            <TerminalSquare className="h-3 w-3 text-sky-300" />
            <span>Connected via personal CLI token</span>
            {hasAvailableRepos && (
              <span className="ml-1 text-slate-400">
                • {selectedReposCount} of {availableReposCount} repo
                {availableReposCount === 1 ? '' : 's'} selected
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-slate-200 mt-1 sm:mt-0"
          >
            <span>
              {expanded ? 'Hide sync details' : 'Need sync instructions?'}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      )}

      {cliDisconnected && (
        <div className="mt-2 text-[11px] text-slate-500">
          Connect the DevImpact CLI to start syncing your GitHub activity. Once
          linked, you&apos;ll be able to choose repos and run{' '}
          <code className="text-[10px] text-slate-200">devimpact sync</code>{' '}
          from your terminal.
        </div>
      )}

      {/* Collapsible details */}
      {!cliDisconnected && expanded && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 space-y-3">
          <div>
            <p className="text-[11px] text-slate-400 mb-1">
              Primary sync (uses your selected repos):
            </p>
            <CopyableCode>devimpact sync</CopyableCode>
            <p className="mt-1 text-[11px] text-slate-500">
              DevImpact will sync the repositories you&apos;ve selected in the
              app. You can update that list anytime via{' '}
              <button
                type="button"
                onClick={handleManageRepos}
                className="underline text-sky-300 hover:text-sky-200"
              >
                repo selection
              </button>
              .
            </p>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 mb-1">
              Advanced: sync specific repos:
            </p>
            <CopyableCode>devimpact sync --repo my-org/my-service</CopyableCode>
            <CopyableCode>
              devimpact sync --repo org/frontend --repo org/api --repo
              org/mobile
            </CopyableCode>
            <p className="mt-1 text-[11px] text-slate-500">
              Use the <code className="text-[10px] text-slate-200">--repo</code>{' '}
              flag if you want to override your saved repo selection for a
              one-off sync.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
