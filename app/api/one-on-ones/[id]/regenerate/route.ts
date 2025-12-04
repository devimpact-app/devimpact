import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { oneOnOneSessions } from '@/lib/db/schema';
import { RegenerateOneOnOneInput } from '@/types/api/one-on-one';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../../_lib/http';
import { generateOneOnOnePrep } from '@/lib/analysis/one-on-ones/generateOneOnOnePrep';
import { formatOneOnOneResponse } from '@/lib/analysis/one-on-ones/formatResponse';

export const POST = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const userId = session.user.id;
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return jsonBadRequest('Missing one-on-one id');
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonBadRequest('Invalid JSON body');
    }

    const parsed = RegenerateOneOnOneInput.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return jsonBadRequest(firstIssue?.message ?? 'Invalid request body');
    }
    const body = parsed.data;
    const timezone = (body.timezone as string | undefined) ?? 'UTC';

    const [row] = await db
      .select()
      .from(oneOnOneSessions)
      .where(
        and(eq(oneOnOneSessions.id, id), eq(oneOnOneSessions.tenantId, userId))
      )
      .limit(1);

    if (!row) {
      return jsonNotFound('One-on-one not found');
    }

    const prepPayload = await generateOneOnOnePrep({
      windowWeeks: row.shortWindowWeeks as any,
      title: row.title ?? undefined,
      timezone,
      db,
      counterpartLabel: row.counterpartLabel ?? undefined,
      counterpartType: row.counterpartType,
      tenantId: userId,
    });

    const [updated] = await db
      .update(oneOnOneSessions)
      .set({
        ...prepPayload,
        meetingAt: row.meetingAt,
        payload: prepPayload.payload,
        updatedAt: new Date(),
        status: 'ready',
      })
      .where(eq(oneOnOneSessions.id, id))
      .returning();

    return jsonOK(formatOneOnOneResponse(updated));
  }
);
