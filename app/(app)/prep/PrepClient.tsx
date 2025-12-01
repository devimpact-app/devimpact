'use client';

import { useRouter } from 'next/navigation';
import { PrepHero } from './components/Hero';
import { PrepQuickActions } from './components/QuickActions';

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
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PrepHero userName={user.name} />
      <PrepQuickActions
        onPerformanceReviewClick={() => {}}
        onOneOnOnePrepClick={() => router.push('prep/one-on-one')}
      />
    </main>
  );
}
