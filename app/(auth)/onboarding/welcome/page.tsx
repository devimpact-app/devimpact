'use client';

import { getTimezone } from '@/lib/utils/date';
import Link from 'next/link';
import { useEffect } from 'react';

export default function OnboardingCheckpoint() {
  async function saveTimezone() {
    try {
      const res = await fetch(`/api/settings/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          timezone: getTimezone(),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(text || 'Failed to update setting.');
        return;
      }
    } catch (err) {
      console.error('Network error while updating settings');
    }
  }

  useEffect(() => {
    saveTimezone();
  }, []);

  return (
    <main className="relative min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-[-220px] top-[240px] h-[420px] w-[520px] rounded-full bg-sky-500/6 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        {/* pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
          Setup checkpoint
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
          Set up DevImpact
        </h1>

        <p className="mt-4 max-w-2xl text-base sm:text-lg text-white/75 leading-relaxed">
          DevImpact is designed for your work GitHub activity — where reviews,
          features, and collaboration actually show up. It works for almost all
          Github org setups, including companies that use SSO - no approvals
          needed.
        </p>

        {/* 3 cards */}
        <div className="mt-10 grid w-full gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
              1
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white/90">
              Install the CLI (once)
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">
              Runs locally. Uses official GitHub auth. No writing to repos.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
              2
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white/90">
              Pick your work repos
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">
              You control what’s included. Add/remove repos anytime.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
              3
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white/90">
              Run your first sync
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">
              Pulls read-only metadata from recent weeks to power your
              experience.
            </p>
          </div>
        </div>

        {/* trust note */}
        <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-left">
          <p className="text-[13px] leading-relaxed text-white/65">
            <span className="text-white/85 font-medium">Privacy note:</span>{' '}
            DevImpact reads metadata (PRs, reviews, commit timestamps) to
            compute patterns. It never pushes code, comments, or makes changes
            to your repos.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/onboarding/cli"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-500 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-400 transition"
          >
            Continue to CLI setup →
          </Link>
        </div>
      </div>
    </main>
  );
}
