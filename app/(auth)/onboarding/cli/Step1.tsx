import { CopyableCode } from '@/components/ui/CopyableCode';
import { Check, KeyRound, RefreshCw } from 'lucide-react';

export function Step1(params: {
  step1Expanded: boolean;
  step1Completed: boolean;
  cliToken: string | null;
  generating: boolean;
  handleGenerate: () => Promise<void>;
}) {
  const {
    step1Expanded,
    step1Completed,
    cliToken,
    generating,
    handleGenerate,
  } = params;
  return (
    <section
      className={`
      rounded-2xl border px-5 py-4 flex flex-col gap-3
      bg-surface-alt border-border
      ${!step1Expanded ? 'opacity-80' : ''}
    `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="min-h-8 min-w-8 flex items-center justify-center rounded-lg bg-[#151928] border border-white/10">
            <KeyRound className="h-4 w-4 text-white/80" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">
              Step 1 · Generate a one-time CLI key
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              This links your local CLI to your DevImpact account. It’s not a
              GitHub token and doesn’t grant access by itself.
            </p>
          </div>
        </div>

        {step1Completed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-200">
            <Check className="h-3 w-3" />
            Ready
          </span>
        )}
      </div>

      {step1Expanded && (
        <div className="mt-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-3">
          {cliToken ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-text-secondary uppercase tracking-wide">
                Your personal CLI key
              </span>
              <div className="flex items-center gap-2">
                <CopyableCode>{cliToken}</CopyableCode>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mt-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {generating ? 'Rotating key…' : 'Rotate key'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                Create a one-time CLI key for this account. You can rotate or
                revoke it later.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-500/70 bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-600/30 disabled:opacity-60"
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
  );
}
