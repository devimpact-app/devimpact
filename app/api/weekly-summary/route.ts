import { buildWeeklySummary } from '@/lib/analysis/weekly-summary';
import { jsonOK, jsonUnauthorized } from '../_lib/http';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { TimelineRangeKeySchema } from '@/types/api/http';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const rawRangeKey = searchParams.get('rangeKey') ?? 'last_week';
  const rangeKey = TimelineRangeKeySchema.parse(rawRangeKey);
  // const startStr = searchParams.get('start');
  // const endStr = searchParams.get('end');
  const timezone = searchParams.get('timezone') ?? 'UTC';

  const summary = await buildWeeklySummary({
    userId,
    rangeKey,
    // rangeStart: startStr,
    // rangeEnd: endStr,
    timezone,
  });
  return jsonOK(summary);
}
