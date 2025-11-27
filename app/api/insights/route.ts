import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { jsonOK, jsonUnauthorized } from '../_lib/http';
import { buildInsights } from '@/lib/analysis/insights';
import { InsightsResponseSchema } from '@/types/api/insights';
import { withSentryUser } from '@/lib/withSentryUser';

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const timezone = searchParams.get('timezone') ?? 'UTC';

  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const safeLimit =
    typeof limit === 'number' && !isNaN(limit) && limit > 0 ? limit : undefined;

  const windowWeeksParam = searchParams.get('windowWeeks');
  const windowWeeks = windowWeeksParam ? Number(windowWeeksParam) : undefined;
  const safeWindowWeeks =
    typeof windowWeeks === 'number' && !isNaN(windowWeeks) && windowWeeks > 0
      ? windowWeeks
      : undefined;

  const { insights, windowStart, windowEnd } = await buildInsights({
    userId,
    timezone,
    limit: safeLimit,
    windowWeeks: safeWindowWeeks,
  });

  const payload = InsightsResponseSchema.parse({
    insights,
    meta: {
      windowStartISO: windowStart.toISOString(),
      windowEndISO: windowEnd.toISOString(),
      generatedAt: new Date().toISOString(),
    },
  });

  return jsonOK(payload);
});
