import { auth } from '@/lib/auth';
import { jsonOK, jsonUnauthorized } from '../../_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';
import { getSyncStatus } from '@/lib/integrations/gcal/sync/sync-status';

export const GET = withSentryUser(async () => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
  const userId = session.user.id;

  const status = await getSyncStatus(userId);

  return jsonOK(status);
});
