import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unstable_noStore as noStore } from 'next/cache';

function assertNever(x: never): never {
  throw new Error(`Unhandled onboarding state: ${x}`);
}

export default async function OnboardingPage() {
  noStore();

  const session = await auth();
  const userFromSession = session?.user;

  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect('/login');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userFromSession.id))
    .limit(1);

  if (!user) {
    redirect('/login');
  }

  const bootstrapLoading =
    user.setupState.bootstrapRecent.status !== 'succeeded' ||
    !user.setupState.ready;

  const state = user.onboardingState ?? 'account_created';

  switch (state) {
    case 'account_created':
      redirect('/onboarding/welcome');
    case 'cli_pending':
    case 'cli_linked':
    case 'syncing':
      redirect('/onboarding/cli');
    case 'synced':
      if (bootstrapLoading) {
        redirect('/onboarding/loading');
      }
      redirect('/dashboard');
    default:
      // Ensure we catch new states at build time
      assertNever(state as never);
  }
}
