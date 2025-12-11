import { NextRequest } from 'next/server';
import { getUserFromCliToken } from '../utils';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '../../_lib/http';
import z from 'zod';
import { RepoSyncPayloadSchema } from '@/types/api/sync';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { runSync } from '@/lib/integrations/github/sync/orchestrator';
import { withSentryUser } from '@/lib/withSentryUser';

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const cliToken = req.headers.get('x-devimpact-cli-token');
    if (!cliToken) {
      return jsonUnauthorized('Unauthorized');
    }

    const user = await getUserFromCliToken(cliToken);
    if (!user) {
      return jsonUnauthorized('Unauthorized');
    }

    const json = await req.json();
    const payload = RepoSyncPayloadSchema.parse(json);

    if (user.githubUsername && user.githubUsername !== payload.githubLogin) {
      return jsonBadRequest('GitHub username mismatch');
    }

    if (user.onboardingState === 'cli_linked') {
      // Update onboarding state if first sync
      await db
        .update(users)
        .set({
          onboardingState: 'syncing',
        })
        .where(eq(users.id, user.id));
    }

    console.log('CLI sync from user', user.id, {
      prs: payload.pulls.length,
    });

    const results = await runSync({
      tenantId: user.id,
      payload,
    });

    return jsonOK({
      userId: user.id,
      ...results,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return jsonBadRequest('Invalid payload');
    }
    console.log('err', err.message);

    return jsonServerError('Internal server error');
  }
});
