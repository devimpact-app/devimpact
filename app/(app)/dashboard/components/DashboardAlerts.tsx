'use client';

import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Props = {
  cliDisconnected: boolean;
  staleSyncDays: number | null;
  backfillLoading: boolean;
};

const STORAGE_KEY = 'devimpact:dashboardAlerts:v1';

export function DashboardAlerts({
  cliDisconnected,
  staleSyncDays,
  backfillLoading,
}: Props) {
  const router = useRouter();

  const { bannerSignature, issues } = useMemo(() => {
    if (backfillLoading) {
      return {
        bannerSignature: 'backfill_loading',
        issues: ['Backfilling older activity'],
      };
    }
    const hasStaleSync = staleSyncDays !== null;
    const issues: string[] = [];
    if (cliDisconnected) issues.push('CLI disconnected');
    if (hasStaleSync)
      issues.push(
        staleSyncDays === -1
          ? 'Last Github sync was a while ago'
          : `Last Github sync ${staleSyncDays} days ago`
      );
    const bannerSignature = issues.join('|');
    return {
      bannerSignature,
      issues,
    };
  }, [backfillLoading, cliDisconnected, staleSyncDays]);

  const [dismissed, setDismissed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    if (!bannerSignature) return;

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === bannerSignature) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch {
      // ignore storage errors
    }
  }, [bannerSignature]);

  if (!isHydrated || issues.length === 0 || dismissed) {
    return null;
  }
  const isBackfill = backfillLoading;

  const buttonText = isBackfill
    ? 'Details'
    : cliDisconnected
      ? 'Fix connection'
      : 'See instructions';

  const title = isBackfill
    ? 'Finishing setup'
    : issues.length > 1
      ? 'DevImpact needs your attention'
      : (issues[0] ?? 'DevImpact status');

  const description = isBackfill
    ? 'We’re backfilling older PR summaries and threads. Recent activity is available; older history will fill in shortly.'
    : issues.length > 1
      ? issues.join(' · ')
      : cliDisconnected
        ? 'Your DevImpact CLI hasn’t reported any recent activity.'
        : `Some of your features may be out of date.`;

  return (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8">
      <div
        className={cn(
          'border-b px-4 sm:px-6 lg:px-8 py-2.5',
          'backdrop-blur-sm',
          'border-amber-500/20 bg-gradient-to-r from-slate-950/90 via-slate-950/85 to-slate-950/95'
        )}
      >
        <div className="mx-auto max-w-7xl flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
            {isBackfill ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : cliDisconnected ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-slate-50 truncate">
              {title}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span className="truncate">{description}</span>

              {issues.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {issues.map((issue) => (
                    <span
                      key={issue}
                      className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-[1px] text-[10px] text-amber-200"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!isBackfill && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  router.push('/settings');
                }}
                className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-50 hover:bg-amber-400/25 transition-colors"
              >
                {buttonText}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDismissed(true);
                  try {
                    if (typeof window !== 'undefined' && bannerSignature) {
                      sessionStorage.setItem(STORAGE_KEY, bannerSignature);
                    }
                  } catch {
                    // ignore storage errors
                  }
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/80 text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
