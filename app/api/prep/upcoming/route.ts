import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { jsonOK, jsonUnauthorized } from '@/app/api/_lib/http';
import { UpcomingCalendarEventsResponseSchema } from '@/types/api/prep';
import { getUpcomingCalendarEvents } from '@/lib/analysis/prep/upcomingEvents';
import { isCalendarConnected } from '@/lib/integrations/gcal/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
  const userId = session.user.id;

  const calendarConnected = await isCalendarConnected(userId);
  if (!calendarConnected) {
    return jsonOK({
      nowISO: new Date().toISOString(),
      lookaheadDays: 0,
      items: [],
      calendarConnected: false,
    });
  }
  const { searchParams } = new URL(req.url);
  const lookaheadDays = Number(searchParams.get('days') ?? '7');
  const limit = Number(searchParams.get('limit') ?? '10');

  const payload = await getUpcomingCalendarEvents({
    tenantId: session.user.id,
    lookaheadDays: Number.isFinite(lookaheadDays) ? lookaheadDays : 7,
    limit: Number.isFinite(limit) ? limit : 10,
  });

  const parsed = UpcomingCalendarEventsResponseSchema.parse({
    ...payload,
    calendarConnected: true,
  });
  return jsonOK(parsed);
}
