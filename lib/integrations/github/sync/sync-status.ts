// import { db } from "@/lib/db/client";
// import { integrationTokens } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import { getActiveIntegrationToken } from "../client";

// export interface SyncStatus {
//   lastSyncedAt: Date | null;
//   coverageStartDate: Date | null;
//   lastSyncStatus?: "ok" | "partial" | "error" | null;
// }

// /**
//  * Get the current sync status for a user
//  */
// export async function getSyncStatus(
//   userId: string,
// ): Promise<SyncStatus | null> {
//   const token = await getActiveIntegrationToken(userId);
//   if (!token) return null;

//   return {
//     lastSyncedAt: token.lastSyncedAt ?? null,
//     coverageStartDate: token.coverageStartDate ?? null,
//     lastSyncStatus: token.lastSyncStatus ?? null,
//   };
// }

// /**
//  * Determine the date to sync from based on sync status
//  */
// export function determineSyncDate(syncStatus: SyncStatus | null): Date {
//   if (syncStatus?.lastSyncedAt) {
//     // Incremental sync: 5-minute buffer to catch delayed updates
//     return new Date(syncStatus.lastSyncedAt.getTime() - 5 * 60 * 1000);
//   }
//   if (syncStatus?.coverageStartDate) {
//     return syncStatus.coverageStartDate;
//   }
//   // Initial sync: last 90 days
//   const d = new Date();
//   d.setDate(d.getDate() - 90);
//   return d;
// }

// /**
//  * Update sync status after successful sync
//  */
// export async function updateSyncStatus(
//   userId: string,
//   opts?: { status?: "ok" | "partial" | "error"; coverageStartDate?: Date },
// ) {
//   const token = await getActiveIntegrationToken(userId);
//   if (!token) return; // no GitHub token to update

//   const now = new Date();
//   const status = opts?.status ?? "ok";

//   const coverage =
//     token.coverageStartDate ??
//     opts?.coverageStartDate ??
//     (() => {
//       const d = new Date();
//       d.setDate(d.getDate() - 90);
//       return d;
//     })();

//   await db
//     .update(integrationTokens)
//     .set({
//       lastSyncedAt: now,
//       lastSyncStatus: status,
//       coverageStartDate: coverage,
//       updatedAt: now,
//     })
//     .where(eq(integrationTokens.id, token.id));
// }

// /** Initial if we have no token or no recorded last sync. */
// export function isInitialSync(syncStatus: SyncStatus | null): boolean {
//   return !syncStatus || !syncStatus.lastSyncedAt;
// }
