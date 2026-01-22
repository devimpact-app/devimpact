'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';

export default function CompleteClient({
  userName,
  calendarConnected,
}: {
  userName?: string | null;
  calendarConnected: boolean;
}) {
  const firstName = useMemo(() => {
    if (!userName) return null;
    return userName.split(' ')[0] ?? null;
  }, [userName]);

  return (
    <main className="min-h-screen bg-background px-6 pt-28">
      <div className="w-full max-w-md text-center mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight mt-2">
            You’re all set{firstName ? `, ${firstName}` : ''}
          </h1>

          <p className="mt-4 text-sm text-text-secondary max-w-md mx-auto">
            DevImpact will quietly keep track of your work over time, so your
            accomplishments aren’t forgotten and meeting prep gets easier.
          </p>

          <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
            What’s now active: Weekly summaries · In-app meeting prep · Private
            impact log · Work rhythm
            {calendarConnected ? ' · Calendar focus awareness' : ''}
          </p>

          <p className="mt-4 text-xs text-text-secondary">
            You can revisit your integration settings anytime.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-500/50 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-400/50 transition"
          >
            Continue to Dashboard →
          </Link>

          <Link
            href="/settings"
            className="inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-medium text-white/50 shadow-sm hover:bg-slate-900 transition border border-white/10"
          >
            View settings
          </Link>
        </div>
      </div>
    </main>
  );
}
