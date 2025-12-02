import { auth } from '@/lib/auth';
import { SettingsClient } from './SettingsClient';
import { redirect } from 'next/navigation';
import { users } from '@/lib/db/schema';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

export default async function SettingsPage() {
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

  const cliDisconnected = !user.cliLinkedAt;

  return <SettingsClient cliDisconnected={cliDisconnected} />;
}
