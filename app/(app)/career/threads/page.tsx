'use client';

import { useMemo, useState } from 'react';
import ThreadsSection from '../components/ThreadsSection';
import { THREAD_CATEGORY_OPTIONS } from './shared';
import { SelectWithChevron } from '@/components/ui/SelectWithChevron';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
] as const;

export default function ThreadsPage() {
  const [limit, setLimit] = useState(20);
  const [sort, setSort] =
    useState<(typeof SORT_OPTIONS)[number]['value']>('recent');
  const [category, setCategory] = useState<string>('all');

  const oldestFirst = sort === 'oldest';
  const categoryKey = category === 'all' ? undefined : category;

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    parts.push('Your ongoing work, organized into meaningful threads.');
    if (categoryKey) {
      const label =
        THREAD_CATEGORY_OPTIONS.find((c) => c.value === categoryKey)?.label ??
        category;
      parts.push(`Filtered to ${label}.`);
    }
    parts.push(
      oldestFirst ? 'Sorted oldest first.' : 'Sorted by recent activity.'
    );
    return parts.join(' ');
  }, [categoryKey, category, oldestFirst]);

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
                Threads
              </h1>
              <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
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

              <label className="sr-only" htmlFor="threads-category">
                Category
              </label>
              <SelectWithChevron>
                <select
                  id="threads-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setLimit(20);
                  }}
                  className={[
                    'h-9 rounded-xl border border-white/10 bg-white/[0.03]',
                    'px-3 pr-9 appearance-none',
                    'text-[12px] font-medium text-white/80',
                    'hover:bg-white/[0.06]',
                    'focus:outline-none focus:ring-2 focus:ring-white/20',
                  ].join(' ')}
                >
                  <option value="all">All categories</option>
                  {THREAD_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </SelectWithChevron>
            </div>
          </div>
        </header>

        <ThreadsSection
          limit={limit}
          oldestFirst={oldestFirst}
          categoryKey={categoryKey}
          handleLoadMore={handleLoadMore}
          hideHeader
        />
      </main>
    </>
  );
}
