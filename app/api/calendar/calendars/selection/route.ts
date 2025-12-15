import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { and, eq, inArray } from 'drizzle-orm';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '../../../_lib/http';
import { CalendarSelectionInputSchema } from '@/types/api/calendar';
import { calendarSelections } from '@/lib/db/schema/gcal';

export const POST = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonBadRequest('Invalid JSON body');
  }

  const parsed = CalendarSelectionInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return jsonBadRequest(firstIssue?.message ?? 'Invalid request body');
  }
  const body = parsed.data;
  const selectedIds = Array.from(new Set(body.selectedCalendarIds));

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(calendarSelections)
        .set({ isSelected: false })
        .where(eq(calendarSelections.tenantId, userId));

      if (selectedIds.length > 0) {
        await tx
          .update(calendarSelections)
          .set({ isSelected: true })
          .where(
            and(
              eq(calendarSelections.tenantId, userId),
              inArray(calendarSelections.id, selectedIds)
            )
          );
      }
    });

    return jsonOK({ ok: true, selectedCount: selectedIds.length });
  } catch (err) {
    console.error('Failed to update calendar selection', err);
    return jsonServerError('Failed to update calendar selection');
  }
});
