'use client';

import { useMemo, useState } from 'react';
import WeeklySummariesSection from '../components/WeeklySummariesSection';
import { SelectWithChevron } from '@/components/ui/SelectWithChevron';
import { GenerateWeeklySummaryButton } from './GenerateWeeklySummaryButton';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
] as const;

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
