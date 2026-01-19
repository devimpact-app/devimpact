import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { withSentryUser } from '@/lib/withSentryUser';
import { jsonBadRequest, jsonOK, jsonUnauthorized } from '../../_lib/http';
import { PatchMeSchema } from '@/types/api/settings';

export const PATCH = withSentryUser(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized('Unauthorized');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonBadRequest('Invalid JSON body');
  }

  const parsed = PatchMeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest('Invalid request body', parsed.error.flatten());
  }

  const { timezone, weeklySummaryEmailEnabled } = parsed.data;

  const update: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof timezone === 'string') {
    update.timezone = timezone.trim();
  }
  if (typeof weeklySummaryEmailEnabled === 'boolean') {
    update.weeklySummaryEmailEnabled = weeklySummaryEmailEnabled;
  }

  const hasUpdates =
    typeof update.timezone === 'string' ||
    typeof update.weeklySummaryEmailEnabled === 'boolean';

  if (!hasUpdates) {
    return jsonOK({ ok: true });
  }

  await db.update(users).set(update).where(eq(users.id, session.user.id));

  return jsonOK({ ok: true });
});
