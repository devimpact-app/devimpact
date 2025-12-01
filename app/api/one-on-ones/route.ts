import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { oneOnOneSessions } from '@/lib/db/schema';
import { generateOneOnOnePrep } from '@/lib/analysis/one-on-ones/generateOneOnOnePrep';
import { CreateOneOnOneInput, OneOnOneResponse } from '@/types/api/one-on-one';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '../_lib/http';

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
    db,
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

  const { payload, ...rowProps } = row;

  const parsedResponse = OneOnOneResponse.safeParse({
    prep: {
      ...rowProps,
      createdAt: rowProps.createdAt.toISOString(),
      updatedAt: rowProps.updatedAt.toISOString(),
      meetingAt: rowProps.meetingAt.toISOString(),
      shortWindowStart: rowProps.shortWindowStart.toISOString(),
      shortWindowEnd: rowProps.shortWindowEnd.toISOString(),
      mediumWindowStart: rowProps.mediumWindowStart.toISOString(),
      mediumWindowEnd: rowProps.mediumWindowEnd.toISOString(),
      talkingPoints: payload.talkingPoints,
      usedInsights: payload.usedInsights,
      usedMetrics: payload.usedMetrics,
      counterpartLabel: rowProps.counterpartLabel ?? undefined,
    },
  });

  if (!parsedResponse.success) {
    return jsonBadRequest('Failed to parse one-on-one response');
  }

  return jsonOK(parsedResponse.data);
});
