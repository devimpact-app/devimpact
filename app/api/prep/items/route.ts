import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  jsonOK,
  jsonUnauthorized,
  jsonBadRequest,
  jsonServerError,
} from '@/app/api/_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';

import {
  PrepGenerateRequestSchema,
  PrepItemListResponse,
  type PrepGenerateRequest,
} from '@/types/api/prep';
import { createPendingPrepItem } from '@/lib/analysis/prep/generate/createPending';
import { formatPrepItemResponse } from '@/lib/analysis/prep/generate/formatResponse';
import { and, desc, eq, lt } from 'drizzle-orm';
import { prepItems } from '@/lib/db/schema';
import { db } from '@/lib/db/client';

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonBadRequest('Invalid JSON body.');
    }

    const parsed = PrepGenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[prep.generate] invalid request', {
        issues: parsed.error.issues,
      });
      return jsonBadRequest('Invalid request.', {
        issues: parsed.error.issues,
      });
    }

    const input: PrepGenerateRequest = parsed.data;

    const result = await createPendingPrepItem({
      tenantId: session.user.id,
      input,
    });

    return jsonOK(result);
  } catch (err: any) {
    console.error('[prep.generate] failed', {
      error: err?.message ?? String(err),
      stack: err?.stack,
    });
    return jsonServerError('Failed to generate prep.');
  }
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

  let where = eq(prepItems.tenantId, userId);

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (Number.isNaN(cursorDate.getTime())) {
      return jsonBadRequest('Invalid cursor');
    }
    where = and(where, lt(prepItems.createdAt, cursorDate)) as any;
  }

  const rows = await db
    .select()
    .from(prepItems)
    .where(and(where, eq(prepItems.status, 'ready')))
    .orderBy(desc(prepItems.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = pageRows.map((row) => formatPrepItemResponse(row).prep);

  const nextCursor =
    hasMore && pageRows[pageRows.length - 1]
      ? pageRows[pageRows.length - 1].createdAt.toISOString()
      : null;

  const parsed = PrepItemListResponse.safeParse({
    items,
    nextCursor,
  });

  if (!parsed.success) {
    return jsonBadRequest('Failed to parse prep items list response');
  }

  return jsonOK(parsed.data);
});
