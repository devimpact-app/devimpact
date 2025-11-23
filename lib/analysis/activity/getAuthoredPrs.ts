import { db } from '@/lib/db/client';
import { PullRequest, pullRequests } from '@/lib/db/schema';
import { and, between, eq, or } from 'drizzle-orm';
import { ActivityQueryParams } from './types';

export async function getAuthoredPrs(
  params: ActivityQueryParams
): Promise<PullRequest[]> {
  const { tenantId, start, end } = params;
  const prRows = await db
    .select()
    .from(pullRequests)
    .where(
      and(
        eq(pullRequests.tenantId, tenantId),
        eq(pullRequests.authorIsTenant, true),
        or(
          between(pullRequests.createdAt, start, end),
          between(pullRequests.mergedAt, start, end)
        )
      )
    );
  return prRows;
}
