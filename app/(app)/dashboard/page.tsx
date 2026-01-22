import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getDaysDiff } from '@/lib/utils/date';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) redirect('/login');
  const cliDisconnected = !user.cliLinkedAt;
  const daysDiff = user.cliLastSyncAt
    ? getDaysDiff(user.cliLastSyncAt, new Date())
    : -1;
  let staleSyncDays = null;
  if (daysDiff === -1 || daysDiff >= 7) {
    staleSyncDays = daysDiff;
  }

  const backfillLoading = user.setupState.backfill90d.status !== 'succeeded';

  return (
    <DashboardClient
      fullName={user.fullName!}
      cliDisconnected={cliDisconnected}
      staleSyncDays={staleSyncDays}
      backfillLoading={backfillLoading}
    />
  );
}
