'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

export default function CompleteClient({
  userName,
}: {
  userName?: string | null;
}) {
  const router = useRouter();

  const firstName = useMemo(() => {
    if (!userName) return null;
    return userName.split(' ')[0] ?? null;
  }, [userName]);

  return (
    <main className="min-h-screen px-6 pt-28">
      <div className="w-full max-w-md text-center mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            You’re all set{firstName ? `, ${firstName}` : ''}
          </h1>

          <p className="text-sm text-text-secondary">
            DevImpact is connected and ready. Your GitHub and calendar data will
            continue syncing to build insights about how you work.
          </p>

          <p className="text-xs text-text-secondary">
            You can revisit GitHub or calendar settings anytime from Settings.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex h-10 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-medium text-slate-950 hover:bg-sky-400"
          >
            Go to dashboard
          </button>

          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="inline-flex h-10 items-center justify-center rounded-full px-6 text-sm text-slate-400 hover:text-slate-200"
          >
            View settings
          </button>
        </div>
      </div>
    </main>
  );
}
