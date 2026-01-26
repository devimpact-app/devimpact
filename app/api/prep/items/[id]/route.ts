import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '@/app/api/_lib/http';
import { formatPrepItemResponse } from '@/lib/domains/prep/generate/formatResponse';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { prepItems } from '@/lib/db/schema';
import { withSentryUser } from '@/lib/withSentryUser';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { UpdatePrepItemInput } from '@/types/api/prep';

export const GET = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const userId = session.user.id;
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return jsonBadRequest('Missing prep id');
    }

    const [row] = await db
      .select()
      .from(prepItems)
      .where(and(eq(prepItems.id, id), eq(prepItems.tenantId, userId)))
      .limit(1);

    if (!row) {
      return jsonNotFound('One-on-one not found');
    }

    return jsonOK(formatPrepItemResponse(row));
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
    const parsed = UpdatePrepItemInput.safeParse(body);
    if (!parsed.success) return jsonBadRequest('Invalid payload');

    const { status } = parsed.data;
    if (!status) return jsonBadRequest('Nothing to update');

    const [row] = await db
      .update(prepItems)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(prepItems.id, id), eq(prepItems.tenantId, userId)))
      .returning();

    if (!row) return jsonNotFound('Prep item not found');

    return jsonOK({ ok: true });
  }
);
