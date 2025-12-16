import { SentryUserBridge } from '@/components/SentryUserBridge';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CalendarSetupClient from './CalendarSetupClient';

export default async function CalendarSetupPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromSettings?: boolean;
  }>;
}) {
  const params = await searchParams;
  const isFromSettings = params.fromSettings ?? false;
  const session = await auth();
  const userFromSession = session?.user;

  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect('/login');
  }

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
              Connect your calendar (recommended)
            </h1>
            <p className="mt-2 text-sm text-text-secondary max-w-xl">
              DevImpact uses your calendar to power automatic meeting prep and
              understand how meetings shape your focus and output — alongside
              your GitHub activity.
            </p>
          </div>
        </header>
        <SentryUserBridge user={user}>
          <CalendarSetupClient
            // initialStatus={userFromSession.name}
            isFromSettings={isFromSettings}
          />
        </SentryUserBridge>
      </main>
    </div>
  );
}
