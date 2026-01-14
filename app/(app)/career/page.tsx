'use client';

import { useRouter } from 'next/navigation';
import ThreadsSection from './components/ThreadsSection';
import WeeklySummariesSection from './components/WeeklySummariesSection';

export default function CareerPage() {
  const router = useRouter();
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
                Career
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Your ongoing work, organized into meaningful threads.
              </p>
            </div>
          </div>
        </header>

        <ThreadsSection
          limit={3}
          onViewAll={() => router.push('/career/threads')}
        />

        <WeeklySummariesSection
          limit={3}
          onViewAll={() => router.push('/career/weekly-summaries')}
        />
      </main>
    </>
  );
}
