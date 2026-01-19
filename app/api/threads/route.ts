import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '../_lib/http';
import {
  GetThreadsResponseSchema,
  ThreadCategorySchema,
  ThreadStatusSchema,
} from '@/types/api/threads';
import { subDays } from 'date-fns';
import { serializeThreadListItem } from '@/lib/domains/threads/api/serializers';
import { listThreadsDb } from '@/lib/domains/threads/db/read/listThreads';
import { decodeThreadCursor } from '@/lib/domains/threads/db/read/cursor';

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const tenantId = session.user.id;

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const cursor = searchParams.get('cursor');
  const lookbackDaysParam = searchParams.get('lookbackDays');
  const limitParam = searchParams.get('limit');
  const statusParam = searchParams.get('status'); // active|archived
  const categoryParam = searchParams.get('category'); // features|tech_debt|...
  const oldestFirstParam = searchParams.get('oldestFirst');
  const oldestFirst = !!oldestFirstParam && oldestFirstParam === 'true';

  const limit = limitParam ? Number(limitParam) : 20;

  const status =
    statusParam && ThreadStatusSchema.safeParse(statusParam).success
      ? statusParam
      : 'active';

  if (categoryParam) {
    const parsedCat = ThreadCategorySchema.safeParse(categoryParam);
    if (!parsedCat.success) return jsonBadRequest('Invalid category');
  }

  const lookbackDays = lookbackDaysParam ? Number(lookbackDaysParam) : 90;
  const since = subDays(new Date(), lookbackDays);

  const decoded = cursor ? decodeThreadCursor(cursor) : null;
  if (cursor && !decoded) return jsonBadRequest('Invalid cursor');
  const { rows, total, nextCursor, lastEventsByThreadId } = await listThreadsDb(
    {
      tenantId,
      status: status as 'active' | 'archived',
      limit,
      since,
      cursor,
      categoryKey: categoryParam ?? undefined,
      oldestFirst,
    }
  );

  const threadsOut = rows.map((r) => {
    const le = lastEventsByThreadId[r.id] ?? null;
    return serializeThreadListItem({ row: r, lastEvent: le });
  });

  const parsed = GetThreadsResponseSchema.safeParse({
    threads: threadsOut,
    totalThreads: Number(total),
    nextCursor,
  });

  if (!parsed.success) {
    return jsonBadRequest('Failed to parse threads response');
  }

  return jsonOK(parsed.data);
});
