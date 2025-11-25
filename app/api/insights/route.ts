import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { jsonOK, jsonUnauthorized } from '../_lib/http';
import { buildInsights } from '@/lib/analysis/insights';
import { InsightsResponseSchema } from '@/types/api/insights';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const timezone = searchParams.get('timezone') ?? 'UTC';

  const { insights, windowStart, windowEnd } = await buildInsights({
    userId,
    timezone,
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
}
