import { auth } from '@/lib/auth';
import { jsonOK, jsonUnauthorized } from '../../_lib/http';
import { deleteUserSyncedData } from '@/lib/maintenance/deleteUserSyncedData';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;

  await deleteUserSyncedData(userId);

  return jsonOK({ ok: true });
}
