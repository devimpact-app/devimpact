"use client";

import {
  Terminal,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

type CliSetupPageProps = {
  userName?: string | null;
  hasCliToken?: boolean;
  hasActivity?: boolean;
};

export default function CliSetupPage({
  userName,
  hasCliToken = false,
  hasActivity = false,
}: CliSetupPageProps) {
  const [cliToken, setCliToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const firstName = userName ? userName.split(" ")[0] : "there";

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/cli/token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate CLI token");
      const data = await res.json();
      setCliToken(data.cliToken);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
    } catch {
      // ignore for now
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
            Welcome, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-text-secondary max-w-xl">
            DevImpact runs as a CLI on{" "}
            <span className="text-text-primary/90">your</span> machine, using
            the official GitHub CLI under your account. You stay in control of
            your code and permissions&mdash;we only see the activity data you
            choose to sync.
          </p>
        </div>

        <div className="hidden sm:flex flex-col gap-2 rounded-2xl border border-border bg-surface-alt px-4 py-3 min-w-[220px]">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            CLI Status
          </div>
          <div className="mt-1 text-sm flex items-center gap-2">
            {hasCliToken ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-text-primary">CLI key issued</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="text-text-primary">Not linked yet</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-text-secondary leading-snug">
            {hasActivity
              ? "We’ve already seen some activity from your CLI sync."
              : "Generate a CLI key and run your first sync to unlock your dashboard."}
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface-alt px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#151928] border border-white/10">
                <KeyRound className="h-4 w-4 text-white/80" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary tracking-tight">
                  Step 1 · Generate your CLI key
                </h2>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  This key links your local CLI to your DevImpact account. It’s
                  not a GitHub token and doesn’t grant access by itself.
                </p>
              </div>
            </div>

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
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary mt-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {generating ? "Rotating key…" : "Rotate key"}
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
          </section>

          <section className="rounded-2xl border border-border bg-surface-alt px-5 py-4 flex flex-col gap-3">
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
                  see your PAT or password&mdash;we only talk to{" "}
                  <code className="text-[10px]">gh api</code>.
                </p>
              </div>
            </div>

            <div className="mt-1 space-y-3 text-[11px] text-text-secondary">
              <div>
                <p className="mb-1 font-medium text-text-primary/90">
                  1. Install GitHub CLI
                </p>
                <pre className="rounded-lg bg-[#050814] border border-white/10 px-3 py-2 text-[11px] text-[#D0E1FF] overflow-x-auto">
                  <code>
                    brew install gh{"\n"}
                    gh auth login
                  </code>
                </pre>
              </div>

              <div>
                <p className="mb-1 font-medium text-text-primary/90">
                  2. Install DevImpact CLI
                </p>
                <pre className="rounded-lg bg-[#050814] border border-white/10 px-3 py-2 text-[11px] text-[#D0E1FF] overflow-x-auto">
                  <code>npm install -g @devimpact/cli</code>
                </pre>
              </div>

              <div>
                <p className="mb-1 font-medium text-text-primary/90">
                  3. Link the CLI to your account
                </p>
                <pre className="rounded-lg bg-[#050814] border border-white/10 px-3 py-2 text-[11px] text-[#D0E1FF] overflow-x-auto">
                  <code>
                    devimpact init
                    {cliToken
                      ? ` --cli-token ${cliToken}`
                      : ` --cli-token <your-cli-key>`}
                  </code>
                </pre>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface-alt px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-text-primary tracking-tight">
                  Step 3 · Pull in your recent work
                </h2>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Run a basic sync from a repo you work in. You&apos;ll see your
                  dashboard update once activity comes in.
                </p>
              </div>
            </div>

            <div className="mt-1 space-y-2 text-[11px] text-text-secondary">
              <p className="font-medium text-text-primary/90">
                From a repo directory:
              </p>
              <pre className="rounded-lg bg-[#050814] border border-white/10 px-3 py-2 text-[11px] text-[#D0E1FF] overflow-x-auto">
                <code>devimpact sync-basic --repo my-org/my-service</code>
              </pre>
              <p className="text-[11px] text-text-secondary leading-snug">
                DevImpact will use <code>gh api</code> to read your PRs,
                reviews, commits and attach them to your account. You can see
                every GitHub call in your terminal and revoke access at any
                time.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface-alt px-4 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">
              How DevImpact uses your data
            </h3>
            <ul className="space-y-2 text-[11px] text-text-secondary leading-relaxed">
              <li>
                • We never see your GitHub password or PAT. All API calls go
                through your local <code className="text-[10px]">gh</code>{" "}
                session.
              </li>
              <li>
                • We read metadata about your PRs, reviews, and commits to build
                timelines and stories about your work.
              </li>
              <li>
                • You can rotate your CLI key or stop syncing at any time.
                Removing <code className="text-[10px]">gh auth</code>{" "}
                immediately cuts off access.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-3">
            <p className="text-[11px] text-text-secondary leading-snug">
              Once you’ve run your first sync, head to the{" "}
              <span className="text-text-primary/90 font-medium">
                Dashboard
              </span>{" "}
              to see your metrics, highlights, and work rhythm. We’ll keep this
              CLI setup handy in{" "}
              <span className="text-text-primary/90 font-medium">
                Settings → CLI access
              </span>
              .
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
