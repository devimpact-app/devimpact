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
  const router = useRouter();

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

          <h1 className="text-3xl font-semibold tracking-tight">
            You’re all set{firstName ? `, ${firstName}` : ''}
          </h1>

          <p className="text-sm text-text-secondary">
            DevImpact is now quietly working in the background. As your GitHub
            {calendarConnected ? ' and calendar' : ''} data syncs, it will
            surface patterns about where your time and leverage actually go.
          </p>

          <div className="flex flex-col mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 items-center">
            <p className="text-xs font-medium text-text-primary mb-3">
              What’s now active
            </p>

            <ul className="space-y-2">
              {[
                'Weekly leverage summary',
                'Work rhythm & deep work detection',
                'In-app meeting prep',
                'Private impact log (no sharing)',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-xs text-text-secondary"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  {item}
                </li>
              ))}

              {calendarConnected && (
                <li className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Calendar-aware focus protection
                </li>
              )}
            </ul>
          </div>

          <p className="mt-4 text-xs text-text-secondary">
            You can revisit GitHub or calendar settings anytime from Settings.
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
