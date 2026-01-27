import { auth } from '@/lib/auth';
import RepoSelectionClient from './RepoSelectionClient';
import { redirect } from 'next/navigation';
import { SentryUserBridge } from '@/components/SentryUserBridge';

export default async function RepoSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromSettings?: boolean;
  }>;
}) {
  const params = await searchParams;
  const isFromSettings = params.fromSettings ?? false;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userFromSession = session.user;

  const githubUsername = session.user.githubUsername;

  const user = {
    id: userFromSession.id,
    email: userFromSession.email ?? undefined,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex max-w-6xl flex-col px-6 py-12 lg:px-10">
        <header className="flex flex-col mb-10 gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Choose your repos
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              DevImpact works best when it sees your real day-to-day work.
              Select the repos where you open PRs and review code most often.
            </p>
          </div>
        </header>

        <SentryUserBridge user={user}>
          <RepoSelectionClient
            githubUsername={githubUsername}
            isFromSettings={isFromSettings}
          />
        </SentryUserBridge>
      </main>
    </div>
  );
}
