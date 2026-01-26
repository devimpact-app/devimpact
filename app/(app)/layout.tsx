import { ReactNode } from 'react';
import { auth } from '@/lib/auth'; // your NextAuth server helper
import { redirect } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { SentryUserBridge } from '@/components/SentryUserBridge';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Gate: must be logged in
  if (!session?.user?.id) redirect('/login');
  const sessionUser = session.user;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!user) {
    redirect('/login');
  }

  const state = user.onboardingState ?? null;
  if (state !== 'synced') redirect('/onboarding');

  const bootstrapLoading =
    user.setupState.bootstrapRecent.status !== 'succeeded' ||
    !user.setupState.ready;
  if (bootstrapLoading) {
    redirect('/onboarding/loading');
  }

  return (
    <SentryUserBridge
      user={{
        id: session.user.id,
        email: session.user.email ?? undefined,
      }}
    >
      <div className="h-screen w-screen flex bg-background text-text-primary overflow-x-hidden">
        <Sidebar userName={sessionUser.name} avatarUrl={sessionUser.image} />
        <div className="flex flex-col flex-1">
          <main className="flex-1 overflow-y-auto no-scrollbar">
            <div className="min-h-screen bg-background text-text-primary">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SentryUserBridge>
  );
}
