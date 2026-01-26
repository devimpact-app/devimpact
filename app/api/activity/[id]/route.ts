import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '@/app/api/_lib/http';
import { activityEvents } from '@/lib/db/schema/activity';
import { pullRequests, reviews } from '@/lib/db/schema';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { formatCalendarEventResponse } from '@/lib/domains/prep/upcoming/formatResponse';
import {
  serializeActivityEventFromPr,
  serializeActivityEventFromReview,
} from '@/lib/domains/timeline/api/serializers';
import { ActivityEvent } from '@/types/api/timeline';
import { UpcomingCalendarEvent } from '@/types/api/prep';

type SourceTable = 'pull_requests' | 'reviews' | 'calendar_events';

function asSourceTable(v: string): SourceTable | null {
  if (v === 'pull_requests' || v === 'reviews' || v === 'calendar_events')
    return v;
  return null;
}

export const GET = withSentryUser(
  async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const tenantId = session.user.id;
    const params = await context.params;
    const activityEventId = params.id;

    if (!activityEventId) return jsonBadRequest('Missing activity event id');

    const [row] = await db
      .select()
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.id, activityEventId),
          eq(activityEvents.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!row) return jsonNotFound('Activity event not found');

    const sourceTable = asSourceTable(row.sourceEntityTable);
    if (!sourceTable) {
      return jsonBadRequest(
        `Unsupported sourceEntityTable: ${row.sourceEntityTable}`
      );
    }

    let sourceRow:
      | { kind: 'legacy_activity_event'; event: ActivityEvent }
      | { kind: 'calendar_event'; event: UpcomingCalendarEvent }
      | null = null;

    if (sourceTable === 'pull_requests') {
      const [pr] = await db
        .select()
        .from(pullRequests)
        .where(
          and(
            eq(pullRequests.id, row.sourceEntityId),
            eq(pullRequests.tenantId, tenantId)
          )
        )
        .limit(1);

      sourceRow = pr
        ? {
            kind: 'legacy_activity_event',
            event: serializeActivityEventFromPr(pr),
          }
        : null;
    }

    if (sourceTable === 'reviews') {
      const [rev] = await db
        .select({
          review: reviews,
          pr: pullRequests,
        })
        .from(reviews)
        .leftJoin(pullRequests, and(eq(reviews.prId, pullRequests.id)))
        .where(
          and(
            eq(reviews.id, row.sourceEntityId),
            eq(reviews.tenantId, tenantId)
          )
        )
        .limit(1);

      sourceRow = rev
        ? {
            kind: 'legacy_activity_event',
            event: serializeActivityEventFromReview(rev.review, rev.pr?.title),
          }
        : null;
    }

    if (sourceTable === 'calendar_events') {
      const [cal] = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.id, row.sourceEntityId),
            eq(calendarEvents.tenantId, tenantId)
          )
        )
        .limit(1);

      sourceRow = cal
        ? {
            kind: 'calendar_event',
            event: formatCalendarEventResponse(cal),
          }
        : null;
    }

    if (!sourceRow) {
      return jsonNotFound('Source row not found for activity event');
    }

    return jsonOK(sourceRow);
  }
);
