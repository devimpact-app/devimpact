import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { CheckCircle2, GitBranch } from 'lucide-react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import TopBar from '@/components/landing/TopBar';
import { HeroSection } from './Hero';
import HowItWorks from '@/components/landing/HowItWorks';

const BulletPoint = ({
  children,
  bold,
}: {
  children: string;
  bold?: boolean;
}) => {
  return (
    <li className="flex items-start gap-2">
      <span className="flex h-3 w-3 items-start justify-center pt-[6px]">
        <span className="h-[3px] w-[3px] rounded-full bg-slate-500" />
      </span>
      <span className={bold ? `font-bold` : ''}>{children}</span>
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
  // if (session) redirect('/onboarding');
  const betaCode = params.code;
  const isValid = betaCode === process.env.BETA_ACCESS_CODE;
  if (!isValid) {
    redirect('/');
  }
  return (
    <main className="min-h-screen z-10 text-text-primary">
      <TopBar code={betaCode} />
      <HeroSection code={betaCode} />

      <div className="mx-auto flex max-w-5xl flex-col px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pt-14 space-y-8">
        <section className="grid">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 shadow-sm shadow-black/30 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-sky-300" />
              <h2 className="text-lg font-semibold text-slate-100">
                What DevImpact will handle for you
              </h2>
            </div>
            <ul className="space-y-1.5 text-slate-400">
              {[
                'Your 1:1 prep assembles itself from your recent work.',
                'Your week is summarized without digging through GitHub.',
                'Your invisible work starts getting captured automatically.',
                'Bottlenecks and scope creep become visible before they hurt you.',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-3.5 w-3.5 items-start justify-center pt-[6px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <HowItWorks />

      <div className="mx-auto flex max-w-5xl flex-col px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pt-14 space-y-8">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-5 shadow-sm shadow-black/40 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                A quick look inside
              </h2>
              <p className="mt-0.5 text-xs text-slate-400 max-w-xl">
                This beta focuses on helping you see a clean weekly picture of
                your work and turn that into concrete talking points for 1:1s.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <figure className="group rounded-xl border border-slate-800/80 bg-slate-950/80 overflow-hidden shadow-sm shadow-black/40">
              <div className="relative aspect-[16/9]">
                <Image
                  src="/images/beta/dashboard.png"
                  alt="DevImpact weekly dashboard with summary, insights, and recent activity."
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority
                />
              </div>
              <figcaption className="border-t border-slate-800/80 px-3.5 py-2.5">
                <p className="text-[11px] text-slate-300">
                  Weekly dashboard – see what you shipped, where you spent time,
                  and the strongest patterns from the last few weeks.
                </p>
              </figcaption>
            </figure>

            <figure className="group rounded-xl border border-slate-800/80 bg-slate-950/80 overflow-hidden shadow-sm shadow-black/40">
              <div className="relative aspect-[16/9]">
                <Image
                  src="/images/beta/insight-panel.png"
                  alt="DevImpact insights page"
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
              <figcaption className="border-t border-slate-800/80 px-3.5 py-2.5">
                <p className="text-[11px] text-slate-300">
                  Insights — explore review dynamics, shipping habits, and
                  friction patterns. Selecting an insight opens a deeper view
                  with supporting examples.
                </p>
              </figcaption>
            </figure>
          </div>
        </section>
      </div>
    </main>
  );
}
