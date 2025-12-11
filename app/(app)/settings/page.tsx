import { auth } from '@/lib/auth';
import { SettingsClient } from './SettingsClient';
import { redirect } from 'next/navigation';
import { getSyncStatus } from '@/lib/integrations/github/sync/sync-status';

export default async function SettingsPage() {
  const session = await auth();
  const userFromSession = session?.user;
  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect('/login');
  }

  const status = await getSyncStatus(userFromSession.id);
  if (!status) {
    redirect('/login');
  }

  const cliDisconnected = !status.cliLinkedAt;
  const selectedReposCount = status.selectedRepos;
  const availableReposCount = status.availableReposCount;

  return (
    <SettingsClient
      cliDisconnected={cliDisconnected}
      selectedReposCount={selectedReposCount}
      availableReposCount={availableReposCount}
    />
  );
}
