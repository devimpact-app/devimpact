import { useMemo, useState } from 'react';
import { Activity, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { ThreadListItem } from '@/types/api/threads';
import Link from 'next/link';
import {
  categoryLabel,
  categoryPillClasses,
  threadRangeLabel,
} from '../../threads/shared';

export function BasedOnThreads({
  threads,
  defaultOpen = false,
}: {
  threads: ThreadListItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const countLabel = useMemo(() => {
    const n = threads?.length ?? 0;
    return `${n} thread${n === 1 ? '' : 's'}`;
  }, [threads]);

  if (!threads?.length) return null;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-start justify-between gap-3 rounded-xl px-2 py-1 text-left transition"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <div className="text-sm font-medium text-white/80">
              Based on threads
            </div>
            <div className="text-xs text-white/45">· {countLabel}</div>
          </div>
          <div className="mt-0.5 text-xs text-white/45">
            Threads that informed this summary
          </div>
        </div>

        <ChevronDown
          className={[
            'h-4 w-4 shrink-0 text-white/45 transition',
            open ? 'rotate-180' : 'rotate-0',
            'group-hover:text-white/70',
          ].join(' ')}
        />
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02]">
          <ul className="space-y-1">
            {threads.map((t) => {
              const range = threadRangeLabel(
                t.firstActivityAt,
                t.lastActivityAt
              );

              return (
                <li key={t.id}>
                  <Link
                    href={`/career/threads/${t.id}`}
                    className={[
                      'group/item flex items-center justify-between gap-3 rounded-xl',
                      'px-3 py-3',
                      'transition hover:bg-white/[0.03]',
                      'focus:outline-none focus:ring-2 focus:ring-white/15',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            categoryPillClasses(t.categoryKey),
                          ].join(' ')}
                        >
                          {categoryLabel(t.categoryKey)}
                        </span>

                        <div className="truncate text-[13px] font-medium text-blue-200 group-hover/item:text-blue-100">
                          {t.title}
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                        {range ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {range}
                          </span>
                        ) : null}

                        <span className="inline-flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {t.eventCountTotal ?? 0} events
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover/item:text-white/45" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
