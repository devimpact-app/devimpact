import { db } from "@/lib/db/client";
import { githubSyncStatus } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface SyncStatus {
  lastSyncedAt: Date | null;
  coverageStartDate: Date | null;
  prsCreatedCount: number | null;
  reviewsGivenCount: number | null;
}

/**
 * Get the current sync status for a user
 */
export async function getSyncStatus(
  userId: string,
): Promise<SyncStatus | null> {
  const [status] = await db
    .select()
    .from(githubSyncStatus)
    .where(eq(githubSyncStatus.userId, userId))
    .limit(1);

  return status || null;
}

/**
 * Determine the date to sync from based on sync status
 */
export function determineSyncDate(syncStatus: SyncStatus | null): Date {
  if (syncStatus?.lastSyncedAt) {
    // Incremental sync: 5 min buffer to catch delayed updates
    return new Date(syncStatus.lastSyncedAt.getTime() - 5 * 60 * 1000);
  } else {
    // Initial sync: last 90 days
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date;
  }
}

/**
 * Update sync status after successful sync
 */
export async function updateSyncStatus(
  userId: string,
  counts: {
    prsCreatedCount?: number;
    reviewsGivenCount?: number;
  },
) {
  const now = new Date();
  const existingStatus = await getSyncStatus(userId);

  if (existingStatus) {
    // Update existing status
    await db
      .update(githubSyncStatus)
      .set({
        lastSyncedAt: now,
        prsCreatedCount:
          (existingStatus.prsCreatedCount || 0) + (counts.prsCreatedCount || 0),
        reviewsGivenCount:
          (existingStatus.reviewsGivenCount || 0) +
          (counts.reviewsGivenCount || 0),
      })
      .where(eq(githubSyncStatus.userId, userId));
  } else {
    // Create new status
    const coverageStartDate = determineSyncDate(null);

    await db.insert(githubSyncStatus).values({
      userId,
      lastSyncedAt: now,
      coverageStartDate,
      prsCreatedCount: counts.prsCreatedCount || 0,
      reviewsGivenCount: counts.reviewsGivenCount || 0,
    });
  }
}

/**
 * Check if this is the initial sync for a user
 */
export function isInitialSync(syncStatus: SyncStatus | null): boolean {
  return !syncStatus;
}
