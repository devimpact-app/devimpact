import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '@/app/api/_lib/http';
import { formatPrepItemResponse } from '@/lib/analysis/prep/generate/formatResponse';
import { generatePrepFromRequest } from '@/lib/analysis/prep/generate/generatePrep';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { prepItems } from '@/lib/db/schema';
import { withSentryUser } from '@/lib/withSentryUser';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const POST = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    console.log('called api');
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
      return jsonNotFound('Prep item not found');
    }

    await db
      .update(prepItems)
      .set({
        status: 'generating',
      })
      .where(eq(prepItems.id, id))
      .returning();

    const payload = await generatePrepFromRequest({
      prepItem: row,
      tenantId: userId,
    });

    const [updated] = await db
      .update(prepItems)
      .set({
        content: payload,
        updatedAt: new Date(),
        status: 'ready',
      })
      .where(eq(prepItems.id, id))
      .returning();

    return jsonOK(formatPrepItemResponse(updated));
  }
);
