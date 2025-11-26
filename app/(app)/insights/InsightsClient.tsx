'use client';

import { RangePicker } from '@/components/dates/RangePicker';
import { useRange } from '@/components/dates/useRangeNavigation';

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function InsightsClient({ user }: Props) {
  const { range, setRange, start, end, label, subLabel } = useRange();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
              Insights about your work
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Patterns, bottlenecks and leverage in how you&apos;ve been working
              over{' '}
              <span className="text-text-primary/80">
                {label.toLowerCase()}
              </span>{' '}
              <span className="text-text-secondary/80">({subLabel})</span>.
            </p>
          </div>

          <div className="flex shrink-0 justify-end">
            <RangePicker value={range} onChange={setRange} />
          </div>
        </div>
      </header>
    </main>
  );
}
