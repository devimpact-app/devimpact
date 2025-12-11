import { NextRequest } from 'next/server';
import { getUserFromCliToken } from '../utils';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '../../_lib/http';
import z from 'zod';
import { AvailableReposInputSchema } from '@/types/api/sync';
import { withSentryUser } from '@/lib/withSentryUser';
import { upsertGithubRepoForTenant } from '@/lib/integrations/github/sync/upsert-repo';

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const cliToken = req.headers.get('x-devimpact-cli-token');
    console.log('cliToken', cliToken);
    if (!cliToken) {
      return jsonUnauthorized('Unauthorized');
    }

    const user = await getUserFromCliToken(cliToken);
    console.log('user', user);
    if (!user) {
      return jsonUnauthorized('Unauthorized');
    }

    const json = await req.json();
    const payload = AvailableReposInputSchema.parse(json);
    console.log('payload', payload);

    if (user.githubUsername && user.githubUsername !== payload.githubLogin) {
      return jsonBadRequest('GitHub username mismatch');
    }

    console.log('Save available repos for user', user.id);

    const results = await upsertGithubRepoForTenant(
      user.id,
      payload.repos,
      false
    );

    return jsonOK({
      userId: user.id,
      inserted: results,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return jsonBadRequest('Invalid payload');
    }

    return jsonServerError('Internal server error');
  }
});
