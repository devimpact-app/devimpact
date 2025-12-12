import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  jsonOK,
  jsonUnauthorized,
  jsonBadRequest,
  jsonServerError,
} from '@/app/api/_lib/http';
import { runSync } from '@/lib/integrations/gcal/sync';

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
  const userId = session.user.id;

  const { error, run } = await runSync(userId);

  if (error && error.code === 'bad_request') {
    return jsonBadRequest(error.message);
  } else if (error && error.code === 'internal') {
    return jsonServerError(error.message);
  }

  return jsonOK(run);
}
