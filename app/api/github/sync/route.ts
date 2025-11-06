import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { syncUserGitHubData } from "@/lib/integrations/github/sync/sync-user-details";
import { getActiveIntegrationToken } from "@/lib/integrations/github/client";
import { db } from "@/lib/db/client";
import { integrationTokens, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    userId: session.user.id,
    onboardingState: session.user.onboardingState,
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { selectedRepos, isInitialSync } = await request.json();

  const activeToken = await getActiveIntegrationToken(session.user.id); // Ensure token is loaded
  if (!activeToken) {
    return NextResponse.json(
      { error: "No active GitHub integration token found" },
      { status: 400 },
    );
  }

  try {
    // Update repos on token
    if (selectedRepos) {
      await db
        .update(integrationTokens)
        .set({ selectedRepos })
        .where(
          and(
            eq(integrationTokens.userId, session.user.id),
            eq(integrationTokens.id, activeToken.id),
          ),
        );
    }

    // If initial sync, also update user
    if (isInitialSync) {
      await db
        .update(users)
        .set({ onboardingState: "syncing" })
        .where(eq(users.id, session.user.id));
    }

    // Trigger sync
    const result = await syncUserGitHubData(session.user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
