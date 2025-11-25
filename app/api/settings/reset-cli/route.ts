import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { jsonOK, jsonUnauthorized } from '../../_lib/http';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized('Unauthorized');
  }

  const userId = session.user.id;

  await db
    .update(users)
    .set({
      cliTokenHash: null,
      cliLinkedAt: null,
    })
    .where(eq(users.id, userId));

  return jsonOK({ ok: true });
}
