import { NextRequest, NextResponse } from 'next/server';
import { getActivityEventsForRange } from '@/lib/analysis/timeline/service/getActivityEventsForRange';
import { auth } from '@/lib/auth'; // if using NextAuth
import { jsonOK, jsonServerError, jsonUnauthorized } from '../_lib/http';
import {
  ActivityEvent,
  ActivityEventsResponseSchema,
} from '@/types/api/timeline';
import { withSentryUser } from '@/lib/withSentryUser';
import { getRecentActivityEvents } from '@/lib/analysis/timeline/service/getRecentActivityEvents';

export const GET = withSentryUser(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const limitParam = searchParams.get('limit');
  const includeMeetingsParam = searchParams.get('includeMeetings');
  const showRecentParam = searchParams.get('showRecent');
  const showRecent = showRecentParam === 'true';
  const includeMeetings = includeMeetingsParam === 'true';

  if ((!startParam || !endParam) && !showRecent) {
    return NextResponse.json(
      { error: 'Missing required query params: start, end or showRecent' },
      { status: 400 }
    );
  }

  let events: ActivityEvent[] = [];
  if (startParam && endParam) {
    const start = new Date(startParam);
    const end = new Date(endParam);
    const limit = limitParam ? Number(limitParam) : undefined;

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start or end date' },
        { status: 400 }
      );
    }

    events = await getActivityEventsForRange({
      tenantId: session.user.id,
      start,
      end,
      limit,
      includeMeetings,
    });
  } else {
    events = await getRecentActivityEvents({
      tenantId: session.user.id,
      limit: limitParam ? Number(limitParam) : undefined,
      includeMeetings,
    });
  }

  const parsed = ActivityEventsResponseSchema.safeParse({
    events,
  });
  if (!parsed.success) {
    console.log(parsed.error);
    return jsonServerError('Failed to parse response');
  }

  return jsonOK({ events: parsed.data.events });
});
