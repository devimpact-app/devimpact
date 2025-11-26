import { SentryUserBridge } from '@/components/SentryUserBridge';
import { CliSetupPageShell } from './CliSetupPage';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function CliSetupPageLoader() {
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
    <SentryUserBridge user={user}>
      <CliSetupPageShell userName={userFromSession.name} />
    </SentryUserBridge>
  );
}
