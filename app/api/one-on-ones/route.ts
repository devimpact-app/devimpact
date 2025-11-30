import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { oneOnOneSessions } from '@/lib/db/schema';
import { generateOneOnOnePrep } from '@/lib/analysis/one-on-ones/generateOneOnOnePrep';
import { CreateOneOnOneInput } from '@/types/api/one-on-one';
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

  const [row] = await db.insert(oneOnOneSessions).values(draft).returning();

  return jsonOK({
    prep: row,
  });
});
