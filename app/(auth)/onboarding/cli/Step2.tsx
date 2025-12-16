import { CopyableCode } from '@/components/CopyableCode';
import { Check, Terminal } from 'lucide-react';

export function Step2(params: {
  step2Enabled: boolean;
  step2Expanded: boolean;
  step3Enabled: boolean;
  cliToken: string | null;
}) {
  const { step2Enabled, step2Expanded, step3Enabled, cliToken } = params;
  return (
    <section
      className={`
      rounded-2xl border px-5 py-4 flex flex-col gap-3
      bg-surface-alt border-border
      ${!step2Enabled ? 'opacity-40 pointer-events-none' : ''}
    `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="min-h-8 min-w-8 flex items-center justify-center rounded-lg bg-[#151928] border border-white/10">
            <Terminal className="h-4 w-4 text-white/80" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">
              Step 2 · Connect your work GitHub account
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              DevImpact uses the official GitHub CLI and your existing
              authentication. All access stays local to your machine.
            </p>
          </div>
        </div>

        {step3Enabled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-200">
            <Check className="h-3 w-3" />
            Installed
          </span>
        )}
      </div>

      {step2Expanded && cliToken && (
        <div className="mt-1 space-y-4 text-sm text-text-secondary">
          <div className="pt-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mb-2">
              Install prerequisites
            </p>

            <div className="space-y-3">
              <div>
                <p className="mb-1 font-medium text-text-primary/90">
                  1. Install GitHub CLI
                </p>
                <CopyableCode>brew install gh</CopyableCode>

                <a
                  href="https://cli.github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-sky-400 hover:text-sky-300"
                >
                  Learn more about GitHub CLI →
                </a>
              </div>

              <div>
                <p className="mb-1 font-medium text-text-primary/90">
                  2. Install DevImpact CLI
                </p>
                <CopyableCode>npm install -g @devimpact/cli</CopyableCode>

                <a
                  href="https://www.npmjs.com/package/@devimpact/cli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-sky-400 hover:text-sky-300"
                >
                  View DevImpact CLI on npm →
                </a>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mb-2">
              Authenticate with GitHub
            </p>

            <div>
              <p className="mb-1 font-medium text-text-primary/90">
                3. Log in (use your work GitHub account)
              </p>
              <CopyableCode>gh auth login</CopyableCode>

              <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
                <p className="text-sm text-amber-100 leading-relaxed">
                  <span className="font-semibold">Important:</span> Sign in with
                  the GitHub account you use for work. If your org uses GitHub
                  SSO, complete the SSO authorization during this login flow.
                </p>

                <a
                  href="/sso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-amber-200/90 cursor-pointer hover:text-amber-200 underline underline-offset-4"
                >
                  Having trouble with SSO? Open the quick guide
                </a>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mb-2">
              Link DevImpact
            </p>

            <div>
              <p className="mb-1 font-medium text-text-primary/90">
                4. Link the CLI to your account
              </p>
              <CopyableCode>{`devimpact init --cli-token ${cliToken}`}</CopyableCode>

              <p className="mt-2 text-xs text-text-secondary">
                This checks which repositories your GitHub CLI can access, so
                you can select the repos where you do most of your real work
                next.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
