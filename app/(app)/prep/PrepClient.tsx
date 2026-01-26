'use client';

import { useRouter } from 'next/navigation';
import { PrepHero } from './components/Hero';
import { PrepQuickActions } from './components/QuickActions';
import { useEffect, useState } from 'react';
import { formatDateTime, getTimezone } from '@/lib/utils/date';
import { UpcomingPrepCardContainer } from '../dashboard/components/Prep';
import { PrepMeetingType, TPrepItemListResponse } from '@/types/api/prep';

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

async function createPrepItem(args: {
  meetingType: PrepMeetingType;
  timezone: string;
  manualKey: string;
}): Promise<{ prepItemId: string }> {
  const res = await fetch('/api/prep/items', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'manual',
      meetingType: args.meetingType,
      manualKey: args.manualKey,
      timezone: args.timezone,
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || 'Failed to create prep item');
  }

  const json = await res.json();
  const prepItemId = json?.data?.prepItemId ?? json?.prepItemId;
  if (!prepItemId || typeof prepItemId !== 'string') {
    throw new Error('Invalid response from /api/prep/items');
  }

  return { prepItemId };
}

export default function PrepClient({ user }: Props) {
  const router = useRouter();

  const [items, setItems] = useState<TPrepItemListResponse['items'] | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/prep/items?limit=20');
        if (!res.ok) throw new Error('Failed to fetch');
        const { data } = await res.json();
        setItems((data as TPrepItemListResponse).items);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleCreatePrep(meetingType: PrepMeetingType) {
    setError(null);

    try {
      setIsWorking(true);
      const timezone = getTimezone();
      const { prepItemId } = await createPrepItem({
        timezone,
        meetingType,
        manualKey: crypto.randomUUID(),
      });
      router.push(`/prep/${encodeURIComponent(prepItemId)}`);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PrepHero userName={user.name} />
      <UpcomingPrepCardContainer variant="prep" />

      <PrepQuickActions
        onOneOnOnePrepClick={() => handleCreatePrep('oneOnOne')}
        onStandupPrepClick={() => handleCreatePrep('standup')}
        disableActions={isWorking}
      />

      <div className="min-w-0">
        {error && (
          <p className="mt-1 text-xs text-rose-300/90 truncate">{error}</p>
        )}
      </div>

      <section className="mt-8 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A1A8C7]">
            Past preps
          </h2>
          {items && items.length > 0 && (
            <span className="text-xs text-slate-500">{items.length} saved</span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-sm shadow-black/40">
          {loading ? (
            <div className="px-4 py-6 text-xs text-slate-400 animate-pulse">
              Loading your past preps…
            </div>
          ) : !items || items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">
              You haven&apos;t generated any meeting prep yet.
              <br />
              <span className="text-slate-500 text-[13px]">
                Start with quick actions above and they&apos;ll show up here
                once saved.
              </span>
            </div>
          ) : (
            <table className="min-w-full text-[13px]">
              <thead className="bg-slate-950/90 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Title
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Meeting date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
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
                      onClick={() => router.push(`/prep/${item.id}`)}
                      className={[
                        'cursor-pointer transition-colors',
                        'hover:bg-slate-900/70',
                        !isLast ? 'border-b border-slate-800/70' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3 text-slate-100">
                        {item.title || 'Untitled meeting prep'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.startAt ? formatDateTime(item.startAt) : '—'}
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
