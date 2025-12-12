import { auth } from '@/lib/auth';
import { jsonOK, jsonServerError, jsonUnauthorized } from '../../_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { and, eq } from 'drizzle-orm';
import { calendarSelections } from '@/lib/db/schema/gcal';
import { ListAvailableCalendarResponseSchema } from '@/types/api/calendar';

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;

  const rows = await db
    .select()
    .from(calendarSelections)
    .where(and(eq(calendarSelections.tenantId, userId)));

  const calendars = rows.map((row) => ({
    id: row.id,
    isSelected: row.isSelected,
    calendarId: row.calendarId,
    summary: row.summary,
    accessRole: row.accessRole,
    timeZone: row.timeZone,
    isPrimary: row.isPrimary ?? false,
  }));

  const parsed = ListAvailableCalendarResponseSchema.safeParse({
    calendars,
  });

  if (!parsed.success) {
    return jsonServerError('Failed to parse calendar list');
  }

  return jsonOK(parsed.data);
});
