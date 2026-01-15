import { ThreadListItem } from '@/types/api/threads';
import { useMemo } from 'react';
import { ActionButton } from '../components/ActionButton';
import { AlertTriangle, ArrowRight, List, Loader2 } from 'lucide-react';
import { StatusPill } from '../components/StatusPill';
import Link from 'next/link';
import { formatDateOnly } from '@/lib/utils/date';
import {
  categoryLabel,
  categoryPillClasses,
} from '../../career/threads/shared';

export function ThreadRowCompact({ thread }: { thread: ThreadListItem }) {
  const lastActive = thread.lastActivityAt ?? thread.firstActivityAt;
  const headline = (thread.summaryHeadline ?? '').trim() || 'No summary yet.';

  return (
    <Link
      href={`/career/threads/${thread.id}`}
      className={[
        'group block w-full',
        'rounded-xl border border-white/10 bg-white/[0.02]',
        'px-3 py-2.5',
        'transition',
        'hover:border-white/20 hover:bg-white/[0.04]',
        'focus:outline-none focus:ring-2 focus:ring-white/20',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={[
                'inline-flex items-center rounded-full border px-2 py-0.5',
                'text-[11px] font-medium leading-none',
                categoryPillClasses(thread.categoryKey),
              ].join(' ')}
            >
              {categoryLabel(thread.categoryKey)}
            </span>

            <div className="truncate text-[13px] font-semibold text-white/90">
              {thread.title}
            </div>

            {thread.status === 'archived' && (
              <span className="text-[11px] text-white/45">Archived</span>
            )}
          </div>

          <div className="mt-1 line-clamp-1 text-[12px] leading-snug text-white/70">
            {headline}
          </div>
        </div>

        <div className="shrink-0 text-[11px] tabular-nums text-white/55">
          Updated {formatDateOnly(lastActive)}
        </div>
      </div>
    </Link>
  );
}

export function RecentThreadsDashboardCard({
  threads,
  isLoading = false,
  error = null,
}: {
  threads?: ThreadListItem[] | null;
  isLoading?: boolean;
  error?: string | null;
}) {
  const state = useMemo(() => {
    if (error) return 'error' as const;
    if (isLoading && !threads) return 'loading' as const;
    if (!threads || threads.length === 0) return 'empty' as const;
    return 'ready' as const;
  }, [error, isLoading, threads]);

  const allThreadsHref = '/career/threads';

  return (
    <section
      className="
        rounded-2xl border border-white/10 
        bg-[#111520] 
        px-5 py-4 
        flex flex-col gap-4 
        w-full
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-white/90">
              Recent Threads
            </h2>
            {state === 'empty' ? (
              <StatusPill kind="neutral" label="No threads yet" />
            ) : null}
            {state === 'loading' ? (
              <StatusPill kind="neutral" label="Loading" />
            ) : null}
            {state === 'error' ? (
              <StatusPill kind="bad" label="Needs attention" />
            ) : null}
          </div>

          {state === 'ready' ? (
            <div className="mt-1 text-[12px] text-white/55">
              A snapshot of your ongoing work, organized into threads.
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {state === 'ready' ? (
            <>
              <ActionButton href={allThreadsHref} variant="secondary">
                <List className="h-4 w-4" />
                See all threads
              </ActionButton>
            </>
          ) : null}

          {state === 'empty' ? (
            <ActionButton href={allThreadsHref} variant="primary">
              View all <ArrowRight className="h-4 w-4" />
            </ActionButton>
          ) : null}

          {state === 'loading' ? (
            <ActionButton href={allThreadsHref} variant="secondary" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </ActionButton>
          ) : null}

          {state === 'error' ? (
            <ActionButton href={allThreadsHref} variant="secondary">
              View threads <ArrowRight className="h-4 w-4" />
            </ActionButton>
          ) : null}
        </div>
      </div>

      {state === 'ready' ? (
        <div className="space-y-2">
          {(threads ?? []).map((thread) => (
            <ThreadRowCompact key={thread.id} thread={thread} />
          ))}
        </div>
      ) : null}

      {state === 'empty' ? (
        <div className="text-[13px] leading-relaxed text-white/70">
          <p>
            Threads group your work into longer-running efforts. Once you’ve
            synced some activity, we’ll automatically surface them here.
          </p>
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="flex items-start gap-3 text-[13px] text-rose-200/80">
          <div className="mt-0.5">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-white/70">
            <p>Failed to load threads.</p>
            {error ? (
              <p className="mt-1 text-[12px] text-white/50">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
