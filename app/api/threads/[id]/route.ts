import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../_lib/http';
import {
  GetThreadDetailResponse,
  GetThreadDetailResponseSchema,
} from '@/types/api/threads';
import {
  serializeThreadBullet,
  serializeThreadEventListItem,
  serializeThreadListItem,
} from '@/lib/analysis/threads/api/serializers';
import { getThreadById } from '@/lib/analysis/threads/db/read/getThreadById';
import { getEventCountsForThread } from '@/lib/analysis/threads/db/read/getEventCountsForThread';
import { getThreadBullets } from '@/lib/analysis/threads/db/read/getThreadBullets';
import { listThreadEvents } from '@/lib/analysis/threads/db/read/listThreadEvents';

export const GET = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const tenantId = session.user.id;
    const params = await context.params;
    const threadId = params.id;

    const t = await getThreadById({ tenantId, threadId });
    if (!t) {
      return jsonNotFound('Thread not found');
    }
    const c = await getEventCountsForThread({ tenantId, threadId });

    const url = new URL(req.url);
    const sp = url.searchParams;

    const limitParam = sp.get('limit');
    const cursor = sp.get('cursor');

    const limitRaw = limitParam ? Number(limitParam) : 50;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;

    const { rows: eventRows, nextCursor } = await listThreadEvents({
      tenantId,
      threadId,
      limit,
      cursor,
    });

    const bulletRows = await getThreadBullets({ tenantId, threadId });
    const bullets = bulletRows.map((r) => serializeThreadBullet(r));

    const events = eventRows.map((r) => serializeThreadEventListItem(r));
    const lastEvent = events.length > 0 ? events[0] : null;
    const out: GetThreadDetailResponse = {
      thread: serializeThreadListItem({
        row: {
          ...t,
          eventCountTotal: Number(c.eventCountTotal ?? 0),
          prCount: Number(c.pr ?? 0),
          reviewCount: Number(c.review ?? 0),
          meetingCount: Number(c.meeting ?? 0),
          oooCount: Number(c.ooo ?? 0),
        },
        lastEvent,
      }),
      bullets,
      events,
      nextCursor,
    };

    const parsed = GetThreadDetailResponseSchema.safeParse(out);
    if (!parsed.success) {
      console.log(parsed.error);
      return jsonBadRequest('Failed to parse thread detail response');
    }

    return jsonOK(parsed.data);
  }
);
