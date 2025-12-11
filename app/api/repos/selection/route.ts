import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { githubRepos } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '../../_lib/http';
import { RepoSelectionInputSchema } from '@/types/api/repos';

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

  const parsed = RepoSelectionInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return jsonBadRequest(firstIssue?.message ?? 'Invalid request body');
  }
  const body = parsed.data;
  const selectedIds = Array.from(new Set(body.selectedRepoIds));

  try {
    await db.transaction(async (tx) => {
      // 1) Clear selection for all repos for this user
      await tx
        .update(githubRepos)
        .set({ isSelected: false })
        .where(eq(githubRepos.tenantId, userId));

      // 2) Mark provided repos as selected (if any)
      if (selectedIds.length > 0) {
        await tx
          .update(githubRepos)
          .set({ isSelected: true })
          .where(
            and(
              eq(githubRepos.tenantId, userId),
              inArray(githubRepos.id, selectedIds)
            )
          );
      }
    });

    return jsonOK({ ok: true, selectedCount: selectedIds.length });
  } catch (err) {
    console.error('Failed to update repo selection', err);
    return jsonServerError('Failed to update repo selection');
  }
});
