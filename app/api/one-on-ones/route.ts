import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { oneOnOneSessions } from '@/lib/db/schema';
import { generateOneOnOnePrep } from '@/lib/analysis/prep/one-on-ones/generateOneOnOnePrep';
import {
  CreateOneOnOneInput,
  OneOnOneListResponse,
} from '@/types/api/one-on-one';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '../_lib/http';
import { and, desc, eq, lt } from 'drizzle-orm';
import { formatOneOnOneResponse } from '@/lib/analysis/prep/one-on-ones/formatResponse';

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

  const parsed = CreateOneOnOneInput.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return jsonBadRequest(firstIssue?.message ?? 'Invalid request body');
  }
  const body = parsed.data;
  const timezone = (body.timezone as string | undefined) ?? 'UTC';

  const draft = await generateOneOnOnePrep({
    tenantId: userId,
    ...body,
    timezone,
  });

  const [row] = await db
    .insert(oneOnOneSessions)
    .values(draft)
    .onConflictDoUpdate({
      target: [
        oneOnOneSessions.tenantId,
        oneOnOneSessions.meetingAt,
        oneOnOneSessions.counterpartType,
      ],
      set: {
        title: draft.title,
        shortWindowStart: draft.shortWindowStart,
        shortWindowEnd: draft.shortWindowEnd,
        mediumWindowStart: draft.mediumWindowStart,
        mediumWindowEnd: draft.mediumWindowEnd,
        payload: draft.payload,
        status: draft.status,
        counterpartLabel: draft.counterpartLabel,
        counterpartType: draft.counterpartType,
        updatedAt: new Date(),
      },
    })
    .returning();

  return jsonOK(formatOneOnOneResponse(row));
});

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const limitParam = searchParams.get('limit');
  const cursor = searchParams.get('cursor');

  const limitRaw = limitParam ? Number(limitParam) : 20;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : 20;

  let where = eq(oneOnOneSessions.tenantId, userId);

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (Number.isNaN(cursorDate.getTime())) {
      return jsonBadRequest('Invalid cursor');
    }
    where = and(where, lt(oneOnOneSessions.createdAt, cursorDate)) as any;
  }

  const rows = await db
    .select()
    .from(oneOnOneSessions)
    .where(and(where, eq(oneOnOneSessions.status, 'ready')))
    .orderBy(desc(oneOnOneSessions.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = pageRows.map((row) => ({
    id: row.id,
    title: row.title,
    meetingAt: row.meetingAt ? row.meetingAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    shortWindowStart: row.shortWindowStart.toISOString(),
    shortWindowEnd: row.shortWindowEnd.toISOString(),
    mediumWindowStart: row.mediumWindowStart.toISOString(),
    mediumWindowEnd: row.mediumWindowEnd.toISOString(),
    status: row.status,
  }));

  const nextCursor =
    hasMore && pageRows[pageRows.length - 1]
      ? pageRows[pageRows.length - 1].createdAt.toISOString()
      : null;

  const parsed = OneOnOneListResponse.safeParse({
    items,
    nextCursor,
  });

  if (!parsed.success) {
    return jsonBadRequest('Failed to parse one-on-one list response');
  }

  return jsonOK(parsed.data);
});
