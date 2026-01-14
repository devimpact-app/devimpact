'use client';

import { ThreadListItem } from '@/types/api/threads';
import { useRouter } from 'next/navigation';
import { ThreadCard } from './ThreadCard';

export function ThreadsSection({
  threads,
  totalThreads,
  isLoading,
  error,
  hideHeader = false,
  onViewAll,
  handleLoadMore,
}: {
  threads: ThreadListItem[];
  totalThreads: number;
  isLoading: boolean;
  error: string | null;
  hideHeader?: boolean;
  onViewAll?: () => void;
  handleLoadMore?: () => void;
}) {
  const router = useRouter();

  const onClickThread = (id: string) => {
    router.push(`/career/threads/${id}`);
  };

  const hasMore = totalThreads > threads.length;
  return (
    <section className="flex flex-col space-y-3">
      {!hideHeader && (
        <header className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-white/90">
              Recent Work Threads
            </h2>
            <span className="text-xs text-white/40">
              Showing 3 of {totalThreads}
            </span>
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
            >
              View all threads
              <span aria-hidden>→</span>
            </button>
          )}
        </header>
      )}

      {isLoading && threads.length === 0 && (
        <div className="space-y-2">
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
        </div>
      )}

      {error && !isLoading && (
        <p className="text-xs text-red-400">An error occurred</p>
      )}

      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} onClick={onClickThread} />
      ))}

      {handleLoadMore && hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            className={[
              'inline-flex items-center justify-center',
              'rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2',
              'text-[12px] font-medium text-white/80 transition',
              'hover:bg-white/[0.06] hover:text-white',
              'focus:outline-none focus:ring-2 focus:ring-white/20',
            ].join(' ')}
          >
            Load more
          </button>
        </div>
      ) : onViewAll ? (
        <button
          className="mt-2 text-white/70 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.03] hover:text-white
hover:border-white/20"
          onClick={onViewAll}
        >
          <div className="flex w-full items-center justify-between text-sm">
            <span>See {totalThreads - 3} more threads</span>
            <span className="text-white/40">→</span>
          </div>
        </button>
      ) : null}
    </section>
  );
}
