// import { db } from "@/lib/db/client";
// import { integrationTokens } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import { getActiveIntegrationToken } from "../client";

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { CliStatus, OnboardingState } from "@/types/api/cli";
import { eq } from "drizzle-orm";

export async function getSyncStatus(userId: string): Promise<CliStatus | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0] ?? null;

  const onboardingState: OnboardingState =
    (user.onboardingState as OnboardingState) ?? "account_created";
  const hasCliToken = !!user.cliTokenHash;
  const cliLinkedAt = user.cliLinkedAt ? user.cliLinkedAt.toISOString() : null;
  const lastSyncAt = user.cliLastSyncAt
    ? user.cliLastSyncAt.toISOString()
    : null;

  let recommendedStartISO: string;

  if (user.cliLastSyncAt) {
    const last = new Date(user.cliLastSyncAt);
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const start = new Date(last.getTime() - bufferMs);
    recommendedStartISO = start.toISOString();
  } else {
    // 90 day default
    const lookbackDays = process.env.SYNC_LOOKBACK_DAYS
      ? parseInt(process.env.SYNC_LOOKBACK_DAYS)
      : 90;
    const start = new Date();
    start.setDate(start.getDate() - lookbackDays);
    start.setHours(0, 0, 0, 0);
    recommendedStartISO = start.toISOString();
  }

  return {
    onboardingState,
    hasCliToken,
    cliLinkedAt,
    lastSyncAt,
    hasActivity: !!user.cliLastSyncAt,
    recommendedStartISO,
  };
}

export async function updateSyncStatus({
  tenantId,
  userLastSyncAt,
  syncWindow,
}: {
  tenantId: string;
  syncWindow: {
    startISO: string;
    endISO: string;
  };
  userLastSyncAt: string | null | undefined;
}) {
  const lastSyncAt = userLastSyncAt ? new Date(userLastSyncAt) : null;
  const windowEnd = new Date(syncWindow.endISO);
  const now = new Date();
  const candidateEnd = windowEnd > now ? now : windowEnd;

  const nextLastSyncAt = lastSyncAt
    ? new Date(Math.max(lastSyncAt.getTime(), candidateEnd.getTime()))
    : candidateEnd;

  await db
    .update(users)
    .set({
      cliLastSyncAt: nextLastSyncAt,
      // Add coverage start if no last sync
      ...(!lastSyncAt
        ? { coverageStartDate: new Date(syncWindow.startISO) }
        : {}),
      updatedAt: now,
      onboardingState: "synced",
    })
    .where(eq(users.id, tenantId));
}

export function isInitialSync(syncStatus: CliStatus | null): boolean {
  return !syncStatus || !syncStatus.lastSyncAt;
}
