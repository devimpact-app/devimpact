'use client';

import { OneOnOnePrep } from '@/types/api/one-on-one';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OneOnOneHeader } from './Header';
import { OneOnOneBody } from './OneOnOneBody';
import { Insight } from '@/types/api/insights';
import { InsightPanel } from '@/app/(app)/insights/InsightPanel';

export default function OneOnOneDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [prep, setPrep] = useState<OneOnOnePrep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (!id) return;
        const res = await fetch(`/api/one-on-ones/${id}`);

        if (!res.ok) {
          setError('Failed to load');
          setLoading(false);
          return;
        }

        const { data } = await res.json();
        setPrep(data.prep);
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!prep) return <div>Not found</div>;

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 pt-5 z-20 pb-3 bg-background border-b border-white/15">
          <OneOnOneHeader prep={prep} />
        </div>

        <div className="pb-8 pt-10">
          <OneOnOneBody
            prep={prep}
            onClickInsight={(insight) => {
              console.log('clicked insight');
              setSelectedInsight(insight);
            }}
          />
        </div>
      </main>
      {selectedInsight && (
        <InsightPanel
          key={selectedInsight.id}
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
    </>
  );
}
