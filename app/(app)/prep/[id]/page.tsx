import { auth } from '@/lib/auth';
import PrepDetailClient from './PrepDetailClient';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getHoursDiff } from '@/lib/utils/date';

export default async function PrepDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) redirect('/login');
  const hoursDiff = user.cliLastSyncAt
    ? getHoursDiff(user.cliLastSyncAt, new Date())
    : -1;
  return <PrepDetailClient id={id} staleSyncHours={hoursDiff} />;
}
