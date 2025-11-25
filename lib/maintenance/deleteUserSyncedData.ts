import { db } from '@/lib/db/client';
import {
  githubPrs,
  githubPrCommits,
  githubReviews,
  githubReviewComments,
  githubTimelineEvents,
  githubPrFiles,
  githubRawData,
  githubRepos,
} from '@/lib/db/schema/github-raw';
import {
  pullRequests,
  reviews,
  prSummaries,
  inferredTeamMemberships,
} from '@/lib/db/schema/github-normalized';
import { eq } from 'drizzle-orm';

/**
 * Hard-deletes all synced + derived GitHub data for a given user/tenant.
 * Does NOT delete the user account itself.
 */
export async function deleteUserSyncedData(tenantId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(prSummaries).where(eq(prSummaries.tenantId, tenantId));

    await tx.delete(pullRequests).where(eq(pullRequests.tenantId, tenantId));
    await tx.delete(reviews).where(eq(reviews.tenantId, tenantId));
    await tx
      .delete(inferredTeamMemberships)
      .where(eq(inferredTeamMemberships.tenantId, tenantId));

    await tx.delete(githubRawData).where(eq(githubRawData.tenantId, tenantId));
    await tx.delete(githubRepos).where(eq(githubRepos.tenantId, tenantId));
    await tx
      .delete(githubReviewComments)
      .where(eq(githubReviewComments.tenantId, tenantId));
    await tx.delete(githubReviews).where(eq(githubReviews.tenantId, tenantId));
    await tx
      .delete(githubPrCommits)
      .where(eq(githubPrCommits.tenantId, tenantId));
    await tx.delete(githubPrFiles).where(eq(githubPrFiles.tenantId, tenantId));
    await tx
      .delete(githubTimelineEvents)
      .where(eq(githubTimelineEvents.tenantId, tenantId));
    await tx.delete(githubPrs).where(eq(githubPrs.tenantId, tenantId));
  });
}
