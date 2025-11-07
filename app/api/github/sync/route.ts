import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { syncUserGitHubData } from "@/lib/integrations/github/sync/sync-user-details";
import { getActiveIntegrationToken } from "@/lib/integrations/github/client";
import { db } from "@/lib/db/client";
import { repositories, RepositoryCreateInput, users } from "@/lib/db/schema";
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
    const repoValues: RepositoryCreateInput[] = selectedRepos.map(
      (repo: any) => ({
        tenantId: session.user.id,
        provider: "github",
        fullName: repo.full_name,
        name: repo.full_name.split("/")[1],
        owner: repo.full_name.split("/")[0],
        externalId: repo.id,
        externalNodeId: repo.node_id,
        isPrivate: repo.private,
        selected: true,
      }),
    );
    await db.insert(repositories).values(repoValues).onConflictDoNothing();

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
