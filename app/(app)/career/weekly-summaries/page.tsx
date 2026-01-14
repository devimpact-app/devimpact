'use client';

import { useMemo, useState } from 'react';
import WeeklySummariesSection from '../components/WeeklySummariesSection';
import { SelectWithChevron } from '@/components/ui/SelectWithChevron';
import { ChevronDown, Sparkles } from 'lucide-react';
import { getTimezone } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { getWeekStartMondayIso, postJson } from './shared';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
] as const;

function GenerateWeeklySummaryButton() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  async function handleGenerateClick(offset: number) {
    setGenerateError(null);
    setGenerateSuccess(null);
    setGenerateLoading(true);
    const weekStartIso = getWeekStartMondayIso(offset);
    try {
      await postJson('/api/weekly-summary/run', {
        timezone: getTimezone(),
        weekStartIso,
        force: true,
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
    <div className="relative">
      <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <button
          type="button"
          className={[
            'inline-flex h-9 items-center gap-2 px-3',
            'text-[12px] font-medium text-white/85',
            'hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/20',
          ].join(' ')}
          onClick={() => handleGenerateClick(-1)}
          disabled={generateLoading}
        >
          <Sparkles className="h-4 w-4 text-white/60" />
          Generate last completed week
        </button>

        <button
          type="button"
          aria-label="More generate options"
          aria-expanded={open}
          className={[
            'inline-flex h-9 items-center justify-center px-2',
            'border-l border-white/10',
            'text-white/60 hover:bg-white/[0.06] hover:text-white/80',
            'focus:outline-none focus:ring-2 focus:ring-white/20',
          ].join(' ')}
          onClick={() => setOpen((v) => !v)}
          disabled={generateLoading}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-2 w-[240px] rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-lg backdrop-blur">
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/[0.06]"
              onClick={() => {
                setOpen(false);
                handleGenerateClick(0);
              }}
              disabled={generateLoading}
            >
              Current week (to date)
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/[0.06]"
              onClick={() => {
                setOpen(false);
                handleGenerateClick(-1);
              }}
              disabled={generateLoading}
            >
              Last completed week
            </button>

            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/[0.06]"
              onClick={() => {
                setOpen(false);
                handleGenerateClick(-2);
              }}
              disabled={generateLoading}
            >
              Two weeks ago
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function WeeklySummariesPage() {
  const [limit, setLimit] = useState(20);
  const [sort, setSort] =
    useState<(typeof SORT_OPTIONS)[number]['value']>('recent');

  const oldestFirst = sort === 'oldest';

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      'Automatically generated weekly summaries grounded in your real work.'
    );
    parts.push(
      oldestFirst ? 'Sorted oldest first.' : 'Sorted by recent activity.'
    );
    return parts.join(' ');
  }, [oldestFirst]);

  const handleLoadMore = () => {
    setLimit((prev) => prev + 20);
  };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 space-y-8 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
                Weekly Summaries
              </h1>
              <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <GenerateWeeklySummaryButton />

              <label className="sr-only" htmlFor="threads-sort">
                Sort
              </label>

              <SelectWithChevron>
                <select
                  id="threads-sort"
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value as (typeof SORT_OPTIONS)[number]['value']
                    )
                  }
                  className={[
                    'h-9 rounded-xl border border-white/10 bg-white/[0.03]',
                    'px-3 pr-9 appearance-none', // 👈 key bits
                    'text-[12px] font-medium text-white/80',
                    'hover:bg-white/[0.06]',
                    'focus:outline-none focus:ring-2 focus:ring-white/20',
                  ].join(' ')}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </SelectWithChevron>
            </div>
          </div>
        </header>

        <WeeklySummariesSection
          limit={limit}
          oldestFirst={oldestFirst}
          handleLoadMore={handleLoadMore}
          hideHeader
        />
      </main>
    </>
  );
}
