import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { jsonOK, jsonUnauthorized } from '../_lib/http';
import { buildWorkRhythm } from '@/lib/analysis/work-rhythm/buildWorkRhythm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized('Unauthorized');
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);

  // Timezone from client (fallback to UTC)
  const timezone = searchParams.get('timezone') ?? 'UTC';

  // TODO: support more than just 4w option
  const rhythm = await buildWorkRhythm({
    userId,
    timezone,
  });

  return jsonOK(rhythm);
}
