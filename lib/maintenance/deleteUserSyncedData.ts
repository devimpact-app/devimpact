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
} from '@/lib/db/schema/github-normalized';
import { eq } from 'drizzle-orm';
import { prepItems } from '../db/schema';
import {
  calendarEvents,
  calendarSelections,
  calendarSyncRuns,
} from '../db/schema/gcal';
import {
  activityEvents,
  threadEvents,
  threads,
  threadSummaryBullets,
} from '../db/schema/activity';
import { weeklySummaries } from '../db/schema/weekly-summary';

/**
 * Hard-deletes all synced + derived GitHub data for a given user/tenant.
 * Does NOT delete the user account itself.
 */
export async function deleteUserSyncedData(tenantId: string) {
  await db.transaction(async (tx) => {
    // Weekly summaries feature
    await tx
      .delete(weeklySummaries)
      .where(eq(weeklySummaries.tenantId, tenantId));

    // Threads feature
    await tx
      .delete(threadSummaryBullets)
      .where(eq(threadSummaryBullets.tenantId, tenantId));
    await tx.delete(threadEvents).where(eq(threadEvents.tenantId, tenantId));
    await tx.delete(threads).where(eq(threads.tenantId, tenantId));
    await tx
      .delete(activityEvents)
      .where(eq(activityEvents.tenantId, tenantId));

    // Prep feature
    await tx.delete(prepItems).where(eq(prepItems.tenantId, tenantId));

    // Calendar integration
    await tx
      .delete(calendarEvents)
      .where(eq(calendarEvents.tenantId, tenantId));
    await tx
      .delete(calendarSyncRuns)
      .where(eq(calendarSyncRuns.tenantId, tenantId));
    await tx
      .delete(calendarSelections)
      .where(eq(calendarSelections.tenantId, tenantId));

    // Normalized tables
    await tx.delete(prSummaries).where(eq(prSummaries.tenantId, tenantId));
    await tx.delete(pullRequests).where(eq(pullRequests.tenantId, tenantId));
    await tx.delete(reviews).where(eq(reviews.tenantId, tenantId));

    // Raw github tables
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
