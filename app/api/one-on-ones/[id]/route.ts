import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { oneOnOneSessions } from '@/lib/db/schema';
import { UpdateOneOnOneInput } from '@/types/api/one-on-one';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../_lib/http';
import { formatOneOnOneResponse } from '@/lib/analysis/one-on-ones/formatResponse';

export const GET = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const userId = session.user.id;
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return jsonBadRequest('Missing one-on-one id');
    }

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

    return jsonOK(formatOneOnOneResponse(row));
  }
);

export const PATCH = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const userId = session.user.id;
    const params = await context.params;
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateOneOnOneInput.safeParse(body);
    if (!parsed.success) return jsonBadRequest('Invalid payload');

    const { status } = parsed.data;
    if (!status) return jsonBadRequest('Nothing to update');

    const [row] = await db
      .update(oneOnOneSessions)
      .set({ status, updatedAt: new Date() })
      .where(
        and(eq(oneOnOneSessions.id, id), eq(oneOnOneSessions.tenantId, userId))
      )
      .returning();

    if (!row) return jsonNotFound('One-on-one not found');

    return jsonOK({ ok: true });
  }
);
