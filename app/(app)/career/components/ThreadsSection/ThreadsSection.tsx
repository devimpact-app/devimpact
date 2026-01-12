'use client';

import { ThreadListItem } from '@/types/api/threads';
import { useRouter } from 'next/navigation';
import { ThreadCard } from './ThreadCard';

export function ThreadsSection({
  threads,
  isLoading,
  error,
  onViewAll,
}: {
  threads: ThreadListItem[];
  isLoading: boolean;
  error: string | null;
  onViewAll?: () => void;
}) {
  const router = useRouter();

  const onClickThread = (id: string) => {
    router.push(`/career/threads/${id}`);
  };
  return (
    <section className="flex flex-col space-y-3">
      <header className="flex flex-row justify-between items-center gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-white/90">
          Recent Work Threads
        </h2>

        <div className="flex items-baseline">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-[12px] text-indigo-300 hover:underline font-medium inline-flex items-center gap-1"
            >
              View all →
            </button>
          )}
        </div>
      </header>

      {isLoading && (
        <div className="space-y-2">
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
        </div>
      )}

      {error && !isLoading && (
        <p className="text-xs text-red-400">An error occurred</p>
      )}

      {threads.map((thread) => (
        <ThreadCard thread={thread} onClick={onClickThread} />
      ))}
    </section>
  );
}
