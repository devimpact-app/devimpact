import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Lock,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const BulletPoint = ({ children }: { children: string }) => {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[6px] h-[3px] w-[3px] rounded-full bg-slate-500" />
      <span>{children}</span>
    </li>
  );
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  // if (session) redirect("/onboarding");
  const betaCode = params.code;
  const isValid = betaCode === process.env.BETA_ACCESS_CODE;
  if (!isValid) {
    redirect('/');
  }
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pt-14 space-y-8">
        <header className="space-y-3 pb-5 border-b border-indigo-400/60">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Early preview
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-50">
            Welcome to DevImpact.
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            A personal engineering dashboard that helps you see your real work
            patterns, prepare for 1:1s quickly, and avoid digging through GitHub
            every time you need context.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 shadow-sm shadow-black/30 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-slate-100">
                What you can do today
              </h2>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-[2px] h-3 w-3 text-emerald-400" />
                <span>
                  Generate focused 1:1 prep packets from your last 1–4 weeks of
                  work.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-[2px] h-3.5 w-3.5 text-emerald-400" />
                <span>
                  See your week as a timeline of PRs, reviews, and commits and
                  understand when your best focus times are.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-[2px] h-3.5 w-3.5 text-emerald-400" />
                <span>
                  Track simple shipping and review metrics without building your
                  own dashboards.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-[2px] h-3.5 w-3.5 text-emerald-400" />
                <span>
                  Spot patterns and bottlenecks in how your work actually flows
                  week to week.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-4 shadow-sm shadow-black/20 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Coming soon
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <BulletPoint>
                Calendar awareness to connect meetings with your coding patterns
              </BulletPoint>
              <BulletPoint>
                Richer narratives for performance review packets
              </BulletPoint>
              <BulletPoint>
                More metrics around deep work, review load, and flow
              </BulletPoint>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-4 shadow-sm shadow-black/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-100">
              Get started with DevImpact
            </h2>
            <p className="max-w-xl text-xs text-slate-400">
              Log in with GitHub to create your account. DevImpact uses
              read-only access to your activity — it never writes to your repos
              or issues.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/login?code=${betaCode}`}
              className={cn(
                'inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold',
                'border border-indigo-500/80 bg-indigo-500/90 text-slate-950',
                'shadow-sm shadow-indigo-900/40 hover:bg-indigo-400 transition-colors'
              )}
            >
              Continue to DevImpact
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-5 shadow-sm shadow-black/40 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                How onboarding works
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Three quick steps. Once the CLI has run a sync, your dashboard
                and 1:1 prep will start to populate.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-[10px]">
                  1
                </span>
                Log in with GitHub
              </div>
              <p className="text-[11px] text-slate-400">
                Use your GitHub account to create a DevImpact profile. We use
                read-only scopes and never push, comment, or modify anything in
                your repos.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-[10px]">
                  2
                </span>
                Install the CLI
              </div>
              <p className="text-[11px] text-slate-400">
                Install the DevImpact CLI once on your laptop or dev machine. It
                runs locally and talks to GitHub on your behalf.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-[10px]">
                  3
                </span>
                Run your first sync
              </div>
              <p className="text-[11px] text-slate-400">
                Point the CLI at one or more repos. DevImpact will pull PR,
                review, and commit metadata for your account.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-4 shadow-sm shadow-black/40 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-slate-100">
                What data DevImpact sees
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              DevImpact is designed to respect your work and your code. We only
              ingest the minimum metadata needed to show you patterns and help
              you prepare for conversations.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-3 space-y-1.5">
                <h3 className="text-[11px] font-semibold text-slate-200">
                  We sync
                </h3>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  <BulletPoint>
                    PR metadata (Ex: title, repo, timestamps, state) for PRs you
                    are involved in.
                  </BulletPoint>
                  <BulletPoint>
                    Review activity and comments authored by you.
                  </BulletPoint>
                  <BulletPoint>
                    Commit metadata (Ex: timestamps, author).
                  </BulletPoint>
                  <BulletPoint>
                    File paths touched for certain insights.
                  </BulletPoint>
                  <BulletPoint>Your GitHub username and org names.</BulletPoint>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-3 space-y-1.5">
                <h3 className="text-[11px] font-semibold text-slate-200">
                  We do{' '}
                  <span className="underline underline-offset-2">not</span> sync
                </h3>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  <BulletPoint>Source code or full diffs.</BulletPoint>
                  <BulletPoint>
                    Secrets, environment variables, or build artifacts.
                  </BulletPoint>
                  <BulletPoint>
                    Anything from outside the repos you point us at.
                  </BulletPoint>
                  <BulletPoint>
                    Data from your teammates&apos; accounts.
                  </BulletPoint>
                </ul>
              </div>
            </div>
          </div>

          {/* Local control */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-4 shadow-sm shadow-black/40 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-300" />
              <h2 className="text-sm font-semibold text-slate-100">
                You stay in control
              </h2>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <BulletPoint>
                Code never leaves your machine. The CLI talks to GitHub, sends
                back metadata, and that&apos;s it.
              </BulletPoint>
              <BulletPoint>
                DevImpact is just for you — we don&apos;t message your manager
                or team, and nothing is posted back to GitHub.
              </BulletPoint>
              <BulletPoint>
                You can delete all synced data for your account at any time from
                the settings page. We treat that as a hard delete.
              </BulletPoint>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
