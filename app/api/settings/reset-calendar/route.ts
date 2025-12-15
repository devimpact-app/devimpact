import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { integrationTokens } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { jsonOK, jsonUnauthorized } from '../../_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';

export const POST = withSentryUser(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized('Unauthorized');
  }

  const userId = session.user.id;

  await db
    .delete(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, userId),
        eq(integrationTokens.provider, 'google_calendar'),
        eq(integrationTokens.tokenType, 'oauth')
      )
    );

  return jsonOK({ ok: true });
});
