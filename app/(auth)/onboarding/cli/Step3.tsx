import { Check, FolderCode } from 'lucide-react';

export function Step3(params: {
  step3Enabled: boolean;
  step3Expanded: boolean;
  hasSelectedRepos: boolean;
  selectedRepoCount: number;
  router: any;
}) {
  const {
    step3Enabled,
    step3Expanded,
    hasSelectedRepos,
    selectedRepoCount,
    router,
  } = params;
  return (
    <section
      className={`
    rounded-2xl border px-5 py-4 flex flex-col gap-3
    bg-surface-alt border-border
    ${!step3Enabled ? 'opacity-40 pointer-events-none' : ''}
  `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="min-h-8 min-w-8 flex items-center justify-center rounded-lg bg-[#151928] border border-white/10">
            <FolderCode className="h-4 w-4 text-white/80" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">
              Step 3 · Choose your repos
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              DevImpact works best when it can see review activity,
              collaboration, and iteration patterns — usually from team or
              company repos.
            </p>
          </div>
        </div>

        {hasSelectedRepos && (
          <span className="inline-flex min-w-24 items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-200">
            <Check className="h-3 w-3" />
            {`${selectedRepoCount} selected`}
          </span>
        )}
      </div>

      {step3Expanded && (
        <div className="mt-2 flex flex-col gap-2 text-sm text-text-secondary">
          <div>
            <button
              type="button"
              onClick={() => {
                router.push('/onboarding/repos');
              }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-500/70 bg-indigo-600/20 px-3 py-1.5 text-sm font-medium text-indigo-100 hover:bg-indigo-600/30"
            >
              Open repo selector
            </button>
          </div>
          <p className="text-xs text-text-secondary">
            You can change this selection later from Settings or this page.
            Repos you don&apos;t select are ignored, even if the CLI can see
            them.
          </p>
        </div>
      )}
    </section>
  );
}
