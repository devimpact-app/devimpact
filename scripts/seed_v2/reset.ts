import { db } from '@/lib/db/client';
import {
  githubPrCommits,
  githubPrFiles,
  pullRequests,
  reviews,
  githubTimelineEvents,
  githubReviewComments,
  githubReviews,
  githubPrs,
  githubRepos,
  prSummaries,
} from '@/lib/db/schema';
import {
  activityEvents,
  threadEvents,
  threads,
} from '@/lib/db/schema/activity';
import {
  calendarEvents,
  calendarSelections,
  calendarSyncRuns,
} from '@/lib/db/schema/gcal';
import { eq } from 'drizzle-orm';

export async function resetTenantData(tenantId: string) {
  await db.delete(threadEvents).where(eq(reviews.tenantId, tenantId));
  await db.delete(threads).where(eq(reviews.tenantId, tenantId));
  await db.delete(activityEvents).where(eq(reviews.tenantId, tenantId));

  await db.delete(calendarEvents).where(eq(reviews.tenantId, tenantId));
  await db.delete(calendarSyncRuns).where(eq(reviews.tenantId, tenantId));
  await db.delete(calendarSelections).where(eq(reviews.tenantId, tenantId));

  await db.delete(prSummaries).where(eq(reviews.tenantId, tenantId));
  await db.delete(reviews).where(eq(reviews.tenantId, tenantId));
  await db.delete(pullRequests).where(eq(pullRequests.tenantId, tenantId));
  await db
    .delete(githubPrCommits)
    .where(eq(githubPrCommits.tenantId, tenantId));
  await db.delete(githubPrFiles).where(eq(githubPrFiles.tenantId, tenantId));
  await db
    .delete(githubTimelineEvents)
    .where(eq(githubTimelineEvents.tenantId, tenantId));
  await db
    .delete(githubReviewComments)
    .where(eq(githubReviewComments.tenantId, tenantId));
  await db.delete(githubReviews).where(eq(githubReviews.tenantId, tenantId));
  await db.delete(githubPrs).where(eq(githubPrs.tenantId, tenantId));
  await db.delete(githubRepos).where(eq(githubRepos.tenantId, tenantId));
}
