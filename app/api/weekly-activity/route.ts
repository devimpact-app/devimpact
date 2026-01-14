import { buildWeeklyActivity } from '@/lib/analysis/weekly-activity/service/buildWeeklyActivity';
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
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return jsonBadRequest('Start and end must be valid ISO date strings');
  }

  const diffMs = end.getTime() - start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = diffMs / dayMs;
  if (diffDays <= 0) {
    return jsonBadRequest('End date must be after start date');
  }
  const MAX_DAYS = 14;
  if (diffDays > MAX_DAYS) {
    return jsonBadRequest(
      `Weekly activity supports at most ${MAX_DAYS} days. Try a narrower range.`
    );
  }

  const summary = await buildWeeklyActivity({
    userId,
    rangeStart: start,
    rangeEnd: end,
    timezone,
  });
  return jsonOK(summary);
});
