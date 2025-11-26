import { buildWeeklySummary } from '@/lib/analysis/weekly-summary';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '../_lib/http';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { withSentryUser } from '@/lib/withSentryUser';

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const startISO = searchParams.get('start');
  const endISO = searchParams.get('end');
  const timezone = searchParams.get('timezone') ?? 'UTC';
  const start = startISO ? new Date(startISO) : null;
  const end = endISO ? new Date(endISO) : null;
  if (!start || !end) {
    return jsonBadRequest('Start and end not valid ISO strings');
  }

  const summary = await buildWeeklySummary({
    userId,
    rangeStart: start,
    rangeEnd: end,
    timezone,
  });
  return jsonOK(summary);
});
