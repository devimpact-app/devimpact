import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import CompleteClient from './CompleteClient';

export default async function OnboardingCompletePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) redirect('/login');

  const [u] = await db
    .select({
      onboardingState: users.onboardingState,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) redirect('/login');

  if (u.onboardingState !== 'synced') {
    redirect('/onboarding/cli');
  }

  return <CompleteClient userName={u.fullName ?? null} />;
}
