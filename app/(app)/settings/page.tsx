import { auth } from '@/lib/auth';
import { SettingsClient } from './SettingsClient';
import { redirect } from 'next/navigation';
import { getSyncStatus as getCliSyncStatus } from '@/lib/integrations/github/sync/sync-status';
import { getSyncStatus as getCalendarSyncStatus } from '@/lib/integrations/gcal/sync/sync-status';

export default async function SettingsPage() {
  const session = await auth();
  const userFromSession = session?.user;
  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect('/login');
  }

  const status = await getCliSyncStatus(userFromSession.id);
  if (!status) {
    redirect('/login');
  }

  const calendarStatus = await getCalendarSyncStatus(userFromSession.id);

  const cliDisconnected = !status.cliLinkedAt;
  const selectedReposCount = status.selectedRepos;
  const availableReposCount = status.availableReposCount;

  const calendarDisconnected = !calendarStatus.connected;
  const selectedCalendarsCount = calendarStatus.selectedCalendarsCount;
  const availableCalendarsCount = calendarStatus.availableCalendarsCount;

  return (
    <SettingsClient
      cliDisconnected={cliDisconnected}
      selectedReposCount={selectedReposCount}
      availableReposCount={availableReposCount}
      calendarDisconnected={calendarDisconnected}
      selectedCalendarsCount={selectedCalendarsCount}
      availableCalendarsCount={availableCalendarsCount}
    />
  );
}
