import { auth } from '@/lib/auth';
import { jsonOK, jsonUnauthorized } from '../../_lib/http';
import { deleteUserSyncedData } from '@/lib/maintenance/deleteUserSyncedData';
import { withSentryUser } from '@/lib/withSentryUser';

export const POST = withSentryUser(async () => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;

  await deleteUserSyncedData(userId);

  return jsonOK({ ok: true });
});
