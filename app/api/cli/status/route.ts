import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { User, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { jsonOK, jsonUnauthorized } from '../../_lib/http';
import { NextRequest } from 'next/server';
import { getUserFromCliToken } from '../utils';
import { getSyncStatus } from '@/lib/integrations/github/sync/sync-status';
import { withSentryUser } from '@/lib/withSentryUser';

export const GET = withSentryUser(async (req: NextRequest) => {
  const cliToken = req.headers.get('x-devimpact-cli-token');

  let user: User | null = null;

  if (cliToken) {
    user = await getUserFromCliToken(cliToken);
  } else {
    const session = await auth();
    if (session?.user?.id) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      user = rows[0] ?? null;
    }
  }

  if (!user) {
    return jsonUnauthorized('Unauthorized');
  }

  const { searchParams } = new URL(req.url);
  const repoNamesParam = searchParams.get('includeRepoNames');
  const includeRepoNames = repoNamesParam === 'true';

  const status = await getSyncStatus(user.id, {
    includeRepoNames,
  });
  return jsonOK(status);
});
