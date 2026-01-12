'use client';

import { useRouter } from 'next/navigation';
import { WeeklySummaryItem } from '@/types/api/weekly-summary';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { useState } from 'react';
import { getTimezone } from '@/lib/utils/date';

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export function WeeklySummariesSection({
  items,
  isLoading,
  error,
  onViewAll,
}: {
  items: WeeklySummaryItem[];
  isLoading: boolean;
  error: string | null;
  onViewAll?: () => void;
}) {
  const router = useRouter();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  const onClickSummary = (id: string) => {
    router.push(`/career/weekly-summaries/${id}`);
  };

  async function handleGenerateClick() {
    setGenerateError(null);
    setGenerateSuccess(null);
    setGenerateLoading(true);
    try {
      await postJson('/api/weekly-summary/run', {
        timezone: getTimezone(),
      });
      setGenerateSuccess('Weekly summary generated');
      router.refresh();
    } catch (e: any) {
      setGenerateError(e.message ?? 'Failed to generate weekly summary');
    } finally {
      setGenerateLoading(false);
    }
  }
  return (
    <section className="flex flex-col space-y-3">
      <header className="flex flex-row justify-between items-center gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-white/90">
          Recent Weekly Summaries
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={generateLoading}
            className={[
              'inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition',
              'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {generateLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/25 border-t-white/70" />
                Generating…
              </>
            ) : (
              'Generate last week'
            )}
          </button>

          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-[12px] text-indigo-300 hover:underline font-medium inline-flex items-center gap-1"
            >
              View all →
            </button>
          )}
        </div>
      </header>

      {generateError ? (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-[12px] text-rose-200/80">
          {generateError}
        </div>
      ) : null}

      {generateSuccess ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[12px] text-emerald-200/80">
          {generateSuccess}
        </div>
      ) : null}

      {isLoading && (
        <div className="space-y-2">
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
        </div>
      )}

      {error && !isLoading && (
        <p className="text-xs text-red-400">An error occurred</p>
      )}

      {!error && !isLoading && items.length === 0 && (
        <p className="text-xs text-slate-400">Nothing to show yet</p>
      )}

      {items.map((item) => (
        <WeeklySummaryCard
          key={item.id}
          summary={item}
          onClick={onClickSummary}
        />
      ))}
    </section>
  );
}
