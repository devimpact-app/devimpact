import { CopyableCode } from '@/components/CopyableCode';
import { Loader2, RefreshCw } from 'lucide-react';

export function Step4(params: {
  step4Enabled: boolean;
  step4Expanded: boolean;
  isSyncing: boolean;
  repoSelectionSupported: boolean;
  hasSelectedRepos: boolean;
}) {
  const {
    step4Enabled,
    step4Expanded,
    isSyncing,
    repoSelectionSupported,
    hasSelectedRepos,
  } = params;
  return (
    <section
      className={`
rounded-2xl border px-5 py-4 flex flex-col gap-3
${isSyncing ? 'border-[#4F46E5] bg-[#111728] animate-pulse' : 'bg-surface-alt border-border'}
${!step4Enabled ? 'opacity-40 pointer-events-none' : ''}
`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="min-h-8 min-w-8 flex items-center justify-center rounded-lg bg-[#151928] border border-white/10">
            <RefreshCw className="h-4 w-4 text-white/80" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">
              Step 4 · Pull in your recent work (last 90 days)
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Run your first sync. DevImpact will pull recent activity from your
              selected repos and start building your work timeline.
            </p>
            {isSyncing && (
              <p className="mt-1 text-xs text-text-secondary">
                A sync usually takes{' '}
                <span className="font-medium">20–60 seconds</span>, depending on
                repo size.
              </p>
            )}
          </div>
        </div>

        {isSyncing && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#1E293B] border border-[#4F46E5] px-2 py-0.5 text-xs text-[#E0E7FF]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Syncing…
          </span>
        )}
      </div>

      {step4Expanded && (
        <div className="mt-2 space-y-3 text-sm text-text-secondary">
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

              <p className="text-sm text-text-secondary leading-snug">
                We only read PRs, reviews, and commits for the repo you choose
                via <code className="text-xs">gh api</code>. You can see the
                progress in your terminal and stop syncing at any time.
              </p>
            </>
          ) : repoSelectionSupported && hasSelectedRepos ? (
            <>
              <p className="font-medium text-text-primary/90">
                To sync the repos you selected in step 3, run this from any
                directory:
              </p>
              <CopyableCode>devimpact sync</CopyableCode>
              <p className="text-sm text-text-secondary leading-snug">
                DevImpact will use <code className="text-xs">gh api</code> to
                read metadata about your PRs, reviews, and commits and attach
                them to your account. You stay in control of your GitHub auth
                and can revoke access at any time.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-text-primary/90">
                From any directory:
              </p>
              <CopyableCode>
                devimpact sync --repo my-org/my-service
              </CopyableCode>
              <p className="text-sm text-text-secondary leading-snug">
                DevImpact will use <code className="text-xs">gh api</code> to
                read metadata about your PRs, reviews, and commits and attach
                them to your account. You stay in control of your GitHub auth
                and can revoke access at any time.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
