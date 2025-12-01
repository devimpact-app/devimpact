'use client';

import { useRouter } from 'next/navigation';
import { PrepHero } from './components/Hero';
import { PrepQuickActions } from './components/QuickActions';
import { TOneOnOneListResponse } from '@/types/api/one-on-one';
import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils/date';

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function PrepClient({ user }: Props) {
  const router = useRouter();

  const [items, setItems] = useState<TOneOnOneListResponse['items'] | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/one-on-ones?limit=20');
        if (!res.ok) throw new Error('Failed to fetch');
        const { data } = await res.json();
        setItems((data as TOneOnOneListResponse).items);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PrepHero userName={user.name} />
      <PrepQuickActions
        onPerformanceReviewClick={() => {}}
        onOneOnOnePrepClick={() => router.push('prep/one-on-one')}
      />
      {/* Past 1:1 preps */}
      <section className="mt-8 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A1A8C7]">
            Past 1:1 preps
          </h2>
          {items && items.length > 0 && (
            <span className="text-[11px] text-slate-500">
              {items.length} saved
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-sm shadow-black/40">
          {loading ? (
            <div className="px-4 py-6 text-xs text-slate-400 animate-pulse">
              Loading your past 1:1 preps…
            </div>
          ) : !items || items.length === 0 ? (
            <div className="px-4 py-6 text-xs text-slate-400">
              You haven&apos;t generated any 1:1 prep yet.
              <br />
              <span className="text-slate-500">
                Start with “Prep for your next 1:1” above and they&apos;ll show
                up here once saved.
              </span>
            </div>
          ) : (
            <table className="min-w-full text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    Title
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    Meeting date
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isLast = idx === items.length - 1;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/prep/one-on-one/${item.id}`)}
                      className={[
                        'cursor-pointer transition-colors',
                        'hover:bg-slate-900/70',
                        !isLast ? 'border-b border-slate-800/70' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3 text-slate-100">
                        {item.title || 'Untitled 1:1 prep'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.meetingAt ? formatDateTime(item.meetingAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
